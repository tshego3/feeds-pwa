import type { FeedError } from '../types';

const NETLIFY_PROXY = 'https://rss-proxy-api.netlify.app/.netlify/functions/fetch-xml?url=';
const CODETABS_PROXY = 'https://api.codetabs.com/v1/proxy/?quest=';
const TIMEOUT_MS = 15_000;

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchFeedXml(feedUrl: string): Promise<string> {
  const encoded = encodeURIComponent(feedUrl);

  // Tier 1: Direct fetch
  try {
    const res = await fetchWithTimeout(feedUrl);
    if (res.ok) return res.text();
  } catch {
    // fall through to proxy
  }

  // Tier 2: Netlify proxy
  try {
    const res = await fetchWithTimeout(`${NETLIFY_PROXY}${encoded}`);
    if (res.ok) return res.text();
  } catch {
    // fall through to next proxy
  }

  // Tier 3: Codetabs proxy
  try {
    const res = await fetchWithTimeout(`${CODETABS_PROXY}${encoded}`);
    if (res.ok) return res.text();
  } catch {
    // all tiers failed
  }

  const error: FeedError = {
    type: 'network',
    message: 'Network error. Please check your connection.',
  };
  throw error;
}
