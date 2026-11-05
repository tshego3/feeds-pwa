import { fetchArticleHtml } from './articleHtml';
import { decodeHtmlEntities } from '../learning/entities';

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
    const html = await fetchArticleHtml(articleUrl, { timeoutMs: OG_TIMEOUT_MS });
    const url = html === null ? null : extractOGImageUrl(html, articleUrl);
    ogCache.set(articleUrl, url);
    return url;
  } finally {
    releaseSlot();
  }
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
