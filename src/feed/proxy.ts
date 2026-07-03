// Self-hosted Cloudflare Worker proxy (see proxy/cors-proxy-worker.js).
// Requests from inside Cloudflare's network pass the bot checks that block
// public proxies on Cloudflare-protected South African sites. Shared by
// fetcher.ts (feed XML) and opengraph.ts (article HTML for og:image).
const CUSTOM_PROXY = 'https://feeds-proxy.feeds-pwa.workers.dev/?url=';

export const PROXY_TIMEOUT_MS = 15_000;

export function buildProxyUrl(targetUrl: string): string {
  return `${CUSTOM_PROXY}${encodeURIComponent(targetUrl)}`;
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
