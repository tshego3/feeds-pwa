/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching';
import { fetchFeedXml } from './feed/fetcher';
import { parseFeedXmlSw } from './feed/swParser';
import type { FeedItem } from './types';

declare const self: ServiceWorkerGlobalScope;

const DB_NAME = 'feeds-db';

// A background event does not get unlimited time: the browser terminates the
// worker shortly after the event settles (~30s in Chromium, less on iOS).
// Sweeping every subscription one at a time — each with a 15s proxy timeout
// plus a 15s direct-fetch fallback, against a 45-feed default list — could not
// finish, so the worker was killed mid-sweep: almost nothing was cached and
// the real notification never showed. Fetch in parallel batches and stop at a
// deadline instead; every batch that completed is already persisted.
const REFRESH_BUDGET_MS = 20_000;
const REFRESH_CONCURRENCY = 6;

// Workbox injects the precache manifest at build time
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Runtime caching for feed XML and images
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  // Navigation — network first, fall back to precached index
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/feeds-pwa/index.html') as Promise<Response>),
    );
    return;
  }

  // Images — cache first
  if (request.destination === 'image') {
    event.respondWith(
      caches.open('images-v1').then((cache) =>
        cache.match(request).then(
          (cached) =>
            cached ??
            fetch(request).then((res) => {
              if (res.ok) cache.put(request, res.clone());
              return res;
            }),
        ),
      ),
    );
    return;
  }
});

// Periodic Background Sync — refresh feeds in the background (Chromium experimental API)
self.addEventListener('periodicsync', (event: Event) => {
  const syncEvent = event as ExtendableEvent & { tag: string };
  if (syncEvent.tag === 'refresh-feeds') {
    syncEvent.waitUntil(backgroundRefreshFeeds());
  }
});

// Web Push — the push worker sends a payload-free push when a subscribed feed
// has a new article; this wakes the SW even when the app is closed or the
// device is locked. Fetch the feeds here and show the real notification.
// The subscription is userVisibleOnly, so a notification MUST be shown for
// every push — repeated silent pushes get the subscription revoked. When the
// refresh finds nothing new (app already cached it, or fetches failed), show
// a generic notice: the worker only pushes when it detected a new article.
self.addEventListener('push', (event) => {
  event.waitUntil(
    backgroundRefreshFeeds()
      // A rejection here would leave the push with no notification at all, and
      // the browser substitutes its own "site updated in background" notice.
      .catch(() => 0)
      .then((totalNewArticles) => {
        if (totalNewArticles === 0) {
          return self.registration.showNotification('feeds', {
            body: 'New articles available',
            icon: '/feeds-pwa/favicon.svg',
            badge: '/feeds-pwa/favicon.svg',
            tag: 'new-articles',
            data: { url: '/feeds-pwa/' },
          } as NotificationOptions);
        }
        return undefined;
      }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients[0];
      if (existing) {
        existing.focus();
      } else {
        self.clients.openWindow('/feeds-pwa/');
      }
    }),
  );
});

// --- Background refresh logic ---

async function backgroundRefreshFeeds(): Promise<number> {
  const deadline = Date.now() + REFRESH_BUDGET_MS;

  // One connection for the whole sweep — the old code opened and closed the
  // database twice per feed, 180 opens for the default subscription list.
  const db = await openFeedsDb();
  if (!db) return 0;

  let totalNewArticles = 0;
  try {
    const subscriptions = await readSubscriptions(db);
    if (subscriptions.length === 0) return 0;

    for (let i = 0; i < subscriptions.length; i += REFRESH_CONCURRENCY) {
      if (Date.now() >= deadline) break;
      const batch = subscriptions.slice(i, i + REFRESH_CONCURRENCY);
      const counts = await Promise.all(
        batch.map(async (feed) => {
          try {
            const xml = await fetchFeedXml(feed.url);
            return await cacheNewArticles(db, parseFeedXmlSw(xml, feed.id));
          } catch {
            // Individual feed failure — skip silently
            return 0;
          }
        }),
      );
      for (const count of counts) totalNewArticles += count;
    }
  } finally {
    db.close();
  }

  if (totalNewArticles > 0) {
    await showNewArticlesNotification(totalNewArticles);
  }
  return totalNewArticles;
}

function openFeedsDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME);
    request.onerror = () => resolve(null);
    // The app hasn't created the DB yet — abort so this versionless open
    // doesn't create an empty v1 database the app would then have to upgrade.
    request.onupgradeneeded = () => {
      request.transaction?.abort();
      resolve(null);
    };
    request.onsuccess = () => {
      const db = request.result;
      // Never hold the app's schema upgrade hostage.
      db.onversionchange = () => db.close();
      resolve(db);
    };
  });
}

function readSubscriptions(db: IDBDatabase): Promise<Array<{ id: number; url: string; title: string }>> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('subscriptions', 'readonly');
      const getAll = tx.objectStore('subscriptions').getAll();
      getAll.onsuccess = () => resolve(getAll.result ?? []);
      tx.onabort = () => resolve([]);
      tx.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

function cacheNewArticles(db: IDBDatabase, articles: FeedItem[]): Promise<number> {
  if (articles.length === 0) return Promise.resolve(0);

  return new Promise((resolve) => {
    let newCount = 0;
    try {
      const tx = db.transaction('articles', 'readwrite');
      const store = tx.objectStore('articles');

      // Settle on the transaction, not on a per-request counter: a throw inside
      // any one request callback used to leave the counter stuck above zero and
      // this promise pending forever, so waitUntil hung until the browser killed
      // the worker — losing the whole sweep.
      tx.oncomplete = () => resolve(newCount);
      tx.onabort = () => resolve(newCount);
      tx.onerror = () => resolve(newCount);

      for (const article of articles) {
        const check = store.get([article.feedId, article.link]);
        check.onsuccess = () => {
          if (check.result) return;
          newCount++;
          store.put(article);
        };
      }
    } catch {
      resolve(0);
    }
  });
}

async function showNewArticlesNotification(count: number): Promise<void> {
  if (Notification.permission !== 'granted') return;

  await self.registration.showNotification('feeds', {
    body: `${count} new ${count === 1 ? 'article' : 'articles'} available`,
    icon: '/feeds-pwa/favicon.svg',
    badge: '/feeds-pwa/favicon.svg',
    tag: 'new-articles',
    data: { url: '/feeds-pwa/' },
  } as NotificationOptions);
}
