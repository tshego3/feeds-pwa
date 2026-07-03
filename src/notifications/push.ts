// Web Push subscription management. The push server is the Cloudflare Worker
// in push-worker/ — it stores subscriptions in KV and, on a 15-minute cron,
// sends a VAPID-signed (payload-free) push when a subscriber's feed has a new
// article. The service worker wakes on push, fetches feeds, and shows the
// notification — this is what makes notifications work when the device is
// locked or the app is closed.
//
// Note: on iOS, Web Push only works once the PWA is installed to the Home
// Screen (iOS 16.4+).

import { fetchWithTimeout } from '../feed/proxy';

const PUSH_WORKER_URL = 'https://feeds-push.feeds-pwa.workers.dev';
const REQUEST_TIMEOUT_MS = 10_000;
// Must stay <= MAX_FEEDS_PER_SUB in push-worker/push-worker.js, or the worker
// rejects the payload with a 400.
const MAX_FEEDS = 200;

// Raw P-256 public key, base64url — must match VAPID_PUBLIC_KEY in
// push-worker/wrangler.toml.
const VAPID_PUBLIC_KEY =
  'BEFwvDvsqGKvy-HyUHw-RFEgzb4XIyS_ddTpCbEsmmvek3vMM1TpFSW4rZnHZZu8cHa4C1pcPXM3f8Ntmr4GY4k';

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

// Subscribes (or re-syncs the feed list of an existing subscription) with the
// push worker. Returns false when push is unsupported or anything fails —
// in-app notifications still work without it.
export async function subscribeToPush(feedUrls: string[]): Promise<boolean> {
  if (!isPushSupported() || feedUrls.length === 0) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));

    const res = await fetchWithTimeout(`${PUSH_WORKER_URL}/subscribe`, REQUEST_TIMEOUT_MS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        feeds: feedUrls.slice(0, MAX_FEEDS),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await fetchWithTimeout(`${PUSH_WORKER_URL}/unsubscribe`, REQUEST_TIMEOUT_MS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    });
  } catch {
    // Best effort — a stale server-side subscription is pruned when the push
    // service returns 410 on the next send.
  }
}

function urlBase64ToUint8Array(base64url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}
