// Self-hosted Cloudflare Worker proxy (see proxy/cors-proxy-worker.js).
// Requests from inside Cloudflare's network pass the bot checks that block
// public proxies on Cloudflare-protected South African sites. Shared by
// fetcher.ts (feed XML) and opengraph.ts (article HTML for og:image).
export const PROXY_ORIGIN = 'https://feeds-proxy.feeds-pwa.workers.dev';
const CUSTOM_PROXY = `${PROXY_ORIGIN}/?url=`;

// Marks proxy requests for lesson source pages. The worker ignores it; the
// service worker matches it to serve those pages cache-first.
export const LESSON_PURPOSE = 'lesson';
// Marks proxy requests for book text from Gutenberg mirrors (cached 60 days).
export const BOOK_PURPOSE = 'book';

export const PROXY_TIMEOUT_MS = 15_000;

export function buildProxyUrl(targetUrl: string, purpose?: string): string {
  const base = `${CUSTOM_PROXY}${encodeURIComponent(targetUrl)}`;
  return purpose ? `${base}&purpose=${encodeURIComponent(purpose)}` : base;
}

export async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}
