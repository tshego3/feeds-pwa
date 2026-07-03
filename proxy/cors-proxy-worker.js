/**
 * CORS proxy for feeds-pwa, deployed as a Cloudflare Worker.
 *
 * Why: some feeds (e.g. dailyinvestor.com) sit behind Cloudflare protection
 * that blocks requests from datacenter IPs, so every public CORS proxy fails.
 * Requests made from inside Cloudflare's own network pass those checks, and
 * the free Workers tier (100k requests/day) is far more than a feed reader needs.
 *
 * Deploy:
 *   1. https://dash.cloudflare.com → Workers & Pages → Create Worker
 *   2. Paste this file, deploy, note the URL (e.g. https://feeds-proxy.<you>.workers.dev)
 *   3. In src/feed/fetcher.ts set:
 *        const CUSTOM_PROXY = 'https://feeds-proxy.<you>.workers.dev/?url=';
 */

const ALLOWED_ORIGIN = 'https://tshego3.github.io';

// The production origin plus local dev servers (vite on any port).
function isAllowedOrigin(origin) {
  if (origin === ALLOWED_ORIGIN) return true;
  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

export default {
  async fetch(request) {
    const targetParam = new URL(request.url).searchParams.get('url');
    if (!targetParam) {
      return new Response('Missing ?url= parameter', { status: 400 });
    }

    let target;
    try {
      target = new URL(targetParam);
    } catch {
      return new Response('Invalid url', { status: 400 });
    }
    if (target.protocol !== 'https:' && target.protocol !== 'http:') {
      return new Response('Invalid url scheme', { status: 400 });
    }

    // Only serve the PWA (and local dev) — keeps the worker from being
    // abused as an open proxy.
    const origin = request.headers.get('Origin');
    if (origin && !isAllowedOrigin(origin)) {
      return new Response('Forbidden', { status: 403 });
    }

    const upstream = await fetch(target.toString(), {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; feeds-pwa RSS reader)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
      cf: { cacheTtl: 300, cacheEverything: true },
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/xml; charset=utf-8',
        // Echo the (validated) requesting origin so localhost dev works too;
        // Vary keeps caches from serving one origin's ACAO to another.
        'Access-Control-Allow-Origin': origin && isAllowedOrigin(origin) ? origin : ALLOWED_ORIGIN,
        Vary: 'Origin',
        'Cache-Control': 'public, max-age=300',
      },
    });
  },
};
