import { buildProxyUrl, fetchWithTimeout } from './proxy';

const ogCache = new Map<string, string | null>();
const inFlight = new Map<string, Promise<string | null>>();
const OG_TIMEOUT_MS = 10_000;

// Article pages are ~100-200KB each and a feed screen resolves ~25 of them at
// once. Cap concurrency so a refresh cannot saturate the connection.
const MAX_CONCURRENT = 4;
let active = 0;
const waiting: Array<() => void> = [];

// Attribute order varies between sites, so match both. `name=` is a common
// (invalid but widespread) substitute for `property=`.
const OG_IMAGE_PATTERNS: readonly RegExp[] = [
  /<meta[^>]+(?:property|name)=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image(?::url)?["']/i,
  /<meta[^>]+(?:property|name)=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
];

export async function fetchOGImageUrl(articleUrl: string): Promise<string | null> {
  if (ogCache.has(articleUrl)) {
    return ogCache.get(articleUrl) ?? null;
  }

  // Several cards can request the same article before the first one resolves.
  const pending = inFlight.get(articleUrl);
  if (pending) return pending;

  const request = resolveOGImageUrl(articleUrl).finally(() => {
    inFlight.delete(articleUrl);
  });
  inFlight.set(articleUrl, request);
  return request;
}

async function resolveOGImageUrl(articleUrl: string): Promise<string | null> {
  await acquireSlot();
  try {
    const html = await fetchArticleHtml(articleUrl);
    const url = html === null ? null : extractOGImageUrl(html, articleUrl);
    ogCache.set(articleUrl, url);
    return url;
  } finally {
    releaseSlot();
  }
}

// Tier 1 is the Cloudflare Worker proxy, which passes the bot checks and CORS
// blocks that make direct article-HTML fetches fail on most sites. Tier 2, the
// direct fetch, only runs when the proxy itself never answered: once the proxy
// has relayed an origin status such as 404, the article is genuinely gone and
// retrying it directly can only repeat that failure with a CORS error on top.
async function fetchArticleHtml(articleUrl: string): Promise<string | null> {
  const proxied = await tryFetchHtml(buildProxyUrl(articleUrl));
  if (proxied.answered) return proxied.html;
  return (await tryFetchHtml(articleUrl)).html;
}

function extractOGImageUrl(html: string, articleUrl: string): string | null {
  for (const pattern of OG_IMAGE_PATTERNS) {
    const raw = html.match(pattern)?.[1];
    if (!raw) continue;
    const absolute = toAbsoluteImageUrl(decodeHtmlEntities(raw), articleUrl);
    if (absolute) return absolute;
  }
  return null;
}

// og:image is sometimes protocol-relative or site-relative, and the value is
// untrusted markup, so only http(s) URLs are accepted.
function toAbsoluteImageUrl(value: string, articleUrl: string): string | null {
  try {
    const url = new URL(value.trim(), articleUrl);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

interface HtmlFetch {
  readonly html: string | null;
  // True when a server replied at all, even with an error status. False means
  // the request never completed, so the next tier is still worth trying.
  readonly answered: boolean;
}

async function tryFetchHtml(url: string): Promise<HtmlFetch> {
  try {
    const res = await fetchWithTimeout(url, OG_TIMEOUT_MS);
    if (!res.ok) return { html: null, answered: true };
    return { html: await res.text(), answered: true };
  } catch {
    // Network failure, CORS block, or timeout. An article without a hero image
    // still renders, so this is never surfaced to the reader.
    return { html: null, answered: false };
  }
}

function acquireSlot(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waiting.push(() => {
      active += 1;
      resolve();
    });
  });
}

function releaseSlot(): void {
  active -= 1;
  waiting.shift()?.();
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCharCode(parseInt(dec, 10)),
    )
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}
