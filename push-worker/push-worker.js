/**
 * Web Push notification worker for feeds-pwa, deployed as a Cloudflare Worker.
 *
 * Why: browser notifications from the PWA itself only fire while the app is
 * open. Real notifications on a locked device require Web Push: the browser's
 * push service wakes the service worker even when the app is closed. That
 * needs a server to (a) hold push subscriptions and (b) send VAPID-signed
 * pushes — this worker is that server, on the free Workers tier.
 *
 * Design: pushes carry no payload (avoids RFC 8291 payload encryption).
 * On a cron tick the worker checks each subscriber's feeds; when a feed has a
 * new latest item it sends an empty push. The PWA's service worker wakes,
 * fetches the feeds itself, and shows the notification with real counts.
 *
 * Deploy (from push-worker/):
 *   1. npx wrangler kv namespace create SUBS   → paste the id into wrangler.toml
 *   2. npx wrangler deploy
 *   3. echo '<private JWK json>' | npx wrangler secret put VAPID_PRIVATE_JWK
 */

const ALLOWED_ORIGIN = 'https://tshego3.github.io';
// Must stay >= MAX_FEEDS in src/notifications/push.ts (the default seed list
// alone is 45 feeds).
const MAX_FEEDS_PER_SUB = 200;

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

// Echo the (validated) requesting origin so localhost dev works too; Vary
// keeps caches from serving one origin's ACAO to another.
function corsHeadersFor(origin) {
  return {
    'Access-Control-Allow-Origin': origin && isAllowedOrigin(origin) ? origin : ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const cors = corsHeadersFor(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (origin && !isAllowedOrigin(origin)) {
      return new Response('Forbidden', { status: 403 });
    }
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: cors });
    }

    const path = new URL(request.url).pathname;
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('Invalid JSON', { status: 400, headers: cors });
    }

    if (path === '/subscribe') return handleSubscribe(body, env, cors);
    if (path === '/unsubscribe') return handleUnsubscribe(body, env, cors);
    return new Response('Not found', { status: 404, headers: cors });
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(checkFeedsAndPush(env));
  },
};

async function handleSubscribe(body, env, cors) {
  const sub = body?.subscription;
  const feeds = body?.feeds;
  if (
    typeof sub?.endpoint !== 'string' ||
    !sub.endpoint.startsWith('https://') ||
    !Array.isArray(feeds) ||
    feeds.length === 0 ||
    feeds.length > MAX_FEEDS_PER_SUB ||
    !feeds.every((f) => typeof f === 'string' && f.startsWith('http'))
  ) {
    return new Response('Invalid subscription payload', { status: 400, headers: cors });
  }

  const key = await endpointKey(sub.endpoint);
  // Preserve lastSeen across feed-list re-syncs so re-subscribing doesn't
  // reset dedup state and trigger a burst of pushes.
  const existing = await env.SUBS.get(key, 'json');
  await env.SUBS.put(
    key,
    JSON.stringify({ subscription: sub, feeds, lastSeen: existing?.lastSeen ?? {} }),
  );
  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

async function handleUnsubscribe(body, env, cors) {
  if (typeof body?.endpoint !== 'string') {
    return new Response('Invalid payload', { status: 400, headers: cors });
  }
  await env.SUBS.delete(await endpointKey(body.endpoint));
  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

// --- Cron: detect new articles and push ---

async function checkFeedsAndPush(env) {
  const list = await env.SUBS.list();
  if (list.keys.length === 0) return;

  const records = (
    await Promise.all(
      list.keys.map(async ({ name }) => ({ key: name, record: await env.SUBS.get(name, 'json') })),
    )
  ).filter(({ record }) => record);

  // Fetch each unique feed once per run
  const uniqueFeeds = [...new Set(records.flatMap((r) => r.record.feeds))];
  const latestByFeed = new Map();
  await Promise.all(
    uniqueFeeds.map(async (url) => {
      const latest = await fetchLatestItemLink(url);
      if (latest) latestByFeed.set(url, latest);
    }),
  );

  for (const { key, record } of records) {
    let baselined = false;
    const lastSeen = record.lastSeen ?? {};
    const newlySeen = {};

    for (const url of record.feeds) {
      const latest = latestByFeed.get(url);
      if (!latest) continue;
      if (lastSeen[url] === undefined) {
        // First sighting — baseline without pushing, so subscribing doesn't
        // immediately notify about articles the user has already seen.
        lastSeen[url] = latest;
        baselined = true;
      } else if (lastSeen[url] !== latest) {
        newlySeen[url] = latest;
      }
    }

    const hasNew = Object.keys(newlySeen).length > 0;
    let pushDelivered = false;
    if (hasNew) {
      const status = await sendPush(record.subscription, env);
      if (status === 404 || status === 410) {
        await env.SUBS.delete(key);
        continue;
      }
      // Only advance lastSeen for the new articles when the push service
      // accepted the send — a transient failure retries on the next cron
      // tick instead of silently dropping the notification.
      pushDelivered = status >= 200 && status < 300;
    }

    if (pushDelivered) Object.assign(lastSeen, newlySeen);
    if (baselined || pushDelivered) {
      await env.SUBS.put(key, JSON.stringify({ ...record, lastSeen }));
    }
  }
}

async function fetchLatestItemLink(feedUrl) {
  try {
    const res = await fetch(feedUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; feeds-pwa RSS reader)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
      cf: { cacheTtl: 300, cacheEverything: true },
    });
    if (!res.ok) return null;
    const xml = await res.text();

    // RSS: first <item><link>…</link>
    const item = /<item[\s>][\s\S]*?<link>([\s\S]*?)<\/link>/i.exec(xml);
    if (item?.[1]) return item[1].trim();
    // Atom: first <entry><link href="…">
    const entry = /<entry[\s>][\s\S]*?<link[^>]*href=["']([^"']+)["']/i.exec(xml);
    if (entry?.[1]) return entry[1].trim();
    return null;
  } catch {
    return null;
  }
}

// --- VAPID (RFC 8292) — payload-free push needs only a signed JWT ---

async function sendPush(subscription, env) {
  try {
    const audience = new URL(subscription.endpoint).origin;
    const jwt = await signVapidJwt(audience, env);
    const res = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        TTL: '3600',
        Urgency: 'normal',
        Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
      },
    });
    return res.status;
  } catch {
    return 0;
  }
}

async function signVapidJwt(audience, env) {
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    JSON.parse(env.VAPID_PRIVATE_JWK),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const header = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const payload = b64url(
    JSON.stringify({
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
      sub: env.VAPID_SUBJECT,
    }),
  );
  const signingInput = `${header}.${payload}`;
  // WebCrypto ECDSA emits the raw r||s form JWS requires — no DER conversion
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${b64url(signature)}`;
}

async function endpointKey(endpoint) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return b64url(digest);
}

function b64url(input) {
  const bytes =
    typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
