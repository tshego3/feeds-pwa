import type { FeedError } from '../types';
import { buildProxyUrl, fetchWithTimeout, PROXY_TIMEOUT_MS } from './proxy';

// Proxies sometimes return their own HTML error pages with a 200 status, so
// a successful response is only trusted if the body looks like a feed.
function looksLikeFeedXml(text: string): boolean {
  const head = text.trimStart().slice(0, 500).toLowerCase();
  if (head.startsWith('<!doctype html') || head.startsWith('<html')) return false;
  const lower = text.toLowerCase();
  return lower.includes('<rss') || lower.includes('<feed') || lower.includes('<rdf');
}

export async function fetchFeedXml(feedUrl: string): Promise<string> {
  // Tier 1: the Cloudflare Worker proxy — the most reliable path (passes
  // Cloudflare bot checks) and serves a 5-minute edge cache.
  try {
    const res = await fetchWithTimeout(buildProxyUrl(feedUrl), PROXY_TIMEOUT_MS);
    if (res.ok) {
      const text = await res.text();
      if (looksLikeFeedXml(text)) return text;
    }
  } catch {
    // Proxy unavailable — fall through to direct fetch
  }

  // Tier 2: direct fetch — works when the feed sends CORS headers.
  try {
    const res = await fetchWithTimeout(feedUrl, PROXY_TIMEOUT_MS);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!looksLikeFeedXml(text)) throw new Error('Response is not a feed');
    return text;
  } catch {
    const error: FeedError = {
      type: 'unavailable',
      message: 'Could not load this feed. The site may be blocking proxy access.',
    };
    throw error;
  }
}
