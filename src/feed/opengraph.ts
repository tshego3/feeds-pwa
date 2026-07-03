import { buildProxyUrl, fetchWithTimeout } from './proxy';

const ogCache = new Map<string, string | null>();
const OG_TIMEOUT_MS = 10_000;

export async function fetchOGImageUrl(articleUrl: string): Promise<string | null> {
  if (ogCache.has(articleUrl)) {
    return ogCache.get(articleUrl) ?? null;
  }

  // Tier 1: Cloudflare Worker proxy — passes the bot checks and CORS blocks
  // that make direct article-HTML fetches fail on most sites.
  let html = await tryFetchHtml(buildProxyUrl(articleUrl));
  // Tier 2: direct fetch — works when the article's site sends CORS headers.
  if (html === null) {
    html = await tryFetchHtml(articleUrl);
  }

  if (html === null) {
    ogCache.set(articleUrl, null);
    return null;
  }

  const match = html.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
  );

  const url = match?.[1] ? decodeHtmlEntities(match[1]) : null;
  ogCache.set(articleUrl, url);
  return url;
}

async function tryFetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(url, OG_TIMEOUT_MS);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
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
