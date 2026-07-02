import type { FeedError } from '../types';

// Optional self-hosted proxy (see proxy/cors-proxy-worker.js). A Cloudflare
// Worker is the only tier that reliably reaches feeds whose Cloudflare
// protection blocks datacenter IPs (e.g. dailyinvestor.com). Set to the
// deployed Worker URL ending in `?url=` to enable it as the first proxy tier.
const CUSTOM_PROXY = '';

const TIMEOUT_MS = 15_000;

interface ProxyTier {
  buildUrl: (encodedFeedUrl: string) => string;
  extract?: (res: Response) => Promise<string>;
}

const PROXY_TIERS: ProxyTier[] = [
  ...(CUSTOM_PROXY
    ? [{ buildUrl: (u: string) => `${CUSTOM_PROXY}${u}` }]
    : []),
  {
    buildUrl: (u) => `https://rss-proxy-api.netlify.app/.netlify/functions/fetch-xml?url=${u}`,
  },
  {
    buildUrl: (u) => `https://api.allorigins.win/raw?url=${u}`,
  },
  {
    buildUrl: (u) => `https://api.codetabs.com/v1/proxy/?quest=${u}`,
  },
  {
    buildUrl: (u) => `https://api.allorigins.win/get?url=${u}`,
    extract: async (res) => {
      const data = (await res.json()) as { contents?: string };
      return data.contents ?? '';
    },
  },
];

async function fetchWithTimeout(url: string, outer?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onOuterAbort = () => controller.abort();
  outer?.addEventListener('abort', onOuterAbort);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
    outer?.removeEventListener('abort', onOuterAbort);
  }
}

// Proxies sometimes return their own HTML error pages with a 200 status, so
// a successful response is only trusted if the body looks like a feed.
function looksLikeFeedXml(text: string): boolean {
  const head = text.trimStart().slice(0, 500).toLowerCase();
  if (head.startsWith('<!doctype html') || head.startsWith('<html')) return false;
  const lower = text.toLowerCase();
  return lower.includes('<rss') || lower.includes('<feed') || lower.includes('<rdf');
}

export async function fetchFeedXml(feedUrl: string): Promise<string> {
  // Tier 1: direct fetch — fastest when the feed sends CORS headers,
  // and fails immediately (no timeout cost) when it doesn't.
  try {
    const res = await fetchWithTimeout(feedUrl);
    if (res.ok) {
      const text = await res.text();
      if (looksLikeFeedXml(text)) return text;
    }
  } catch {
    // CORS or network failure — fall through to proxies
  }

  // Tier 2: race all proxies in parallel; first response that is a valid
  // feed wins and the rest are aborted. Each proxy works for some feeds and
  // fails for others, so sequential fallback would often burn 15s per tier.
  const encoded = encodeURIComponent(feedUrl);
  const raceController = new AbortController();

  const attempts = PROXY_TIERS.map(async (tier) => {
    const res = await fetchWithTimeout(tier.buildUrl(encoded), raceController.signal);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = tier.extract ? await tier.extract(res) : await res.text();
    if (!looksLikeFeedXml(text)) throw new Error('Response is not a feed');
    return text;
  });

  try {
    const xml = await Promise.any(attempts);
    raceController.abort();
    return xml;
  } catch {
    const error: FeedError = {
      type: 'unavailable',
      message: 'Could not load this feed. The site may be blocking proxy access.',
    };
    throw error;
  }
}
