/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching';
import { fetchFeedXml } from './feed/fetcher';

declare const self: ServiceWorkerGlobalScope;

const DB_NAME = 'feeds-db';

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
    backgroundRefreshFeeds().then((totalNewArticles) => {
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
  const subscriptions = await getSubscriptionsFromDb();
  if (subscriptions.length === 0) return 0;

  let totalNewArticles = 0;

  for (const feed of subscriptions) {
    try {
      const xml = await fetchFeedXml(feed.url);
      const articles = parseRssXmlSw(xml, feed.id);
      const newCount = await cacheNewArticles(feed.id, articles);
      totalNewArticles += newCount;
    } catch {
      // Individual feed failure — skip silently
    }
  }

  if (totalNewArticles > 0) {
    await showNewArticlesNotification(totalNewArticles);
  }
  return totalNewArticles;
}

function parseRssXmlSw(xml: string, feedId: number): Array<{ feedId: number; link: string; title: string }> {
  // Minimal parser for SW context — only needs link + title for dedup and notification
  const items: Array<{ feedId: number; link: string; title: string }> = [];
  // Use regex-based extraction since DOMParser may not be available in all SW contexts
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match = itemRegex.exec(xml);
  let count = 0;

  while (match && count < 100) {
    const block = match[1] ?? '';
    const linkMatch = /<link>([\s\S]*?)<\/link>/.exec(block);
    const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(block);
    const link = linkMatch?.[1]?.trim() ?? '';
    const title = titleMatch?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1')?.trim() ?? '';

    if (link) {
      items.push({ feedId, link, title });
    }
    match = itemRegex.exec(xml);
    count++;
  }
  return items;
}

async function getSubscriptionsFromDb(): Promise<Array<{ id: number; url: string; title: string }>> {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME);
    request.onerror = () => resolve([]);
    // The app hasn't created the DB yet — abort so this versionless open
    // doesn't create an empty v1 database the app would then have to upgrade.
    request.onupgradeneeded = () => {
      request.transaction?.abort();
      resolve([]);
    };
    request.onsuccess = () => {
      const db = request.result;
      // Never hold the app's schema upgrade hostage: close when asked, and
      // close as soon as the read completes.
      db.onversionchange = () => db.close();
      try {
        const tx = db.transaction('subscriptions', 'readonly');
        const store = tx.objectStore('subscriptions');
        const getAll = store.getAll();
        getAll.onsuccess = () => resolve(getAll.result ?? []);
        getAll.onerror = () => resolve([]);
        tx.oncomplete = () => db.close();
        tx.onabort = () => db.close();
      } catch {
        db.close();
        resolve([]);
      }
    };
  });
}

async function cacheNewArticles(
  feedId: number,
  articles: Array<{ feedId: number; link: string; title: string }>,
): Promise<number> {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME);
    request.onerror = () => resolve(0);
    request.onupgradeneeded = () => {
      request.transaction?.abort();
      resolve(0);
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      try {
        const tx = db.transaction('articles', 'readwrite');
        tx.oncomplete = () => db.close();
        tx.onabort = () => db.close();
        const store = tx.objectStore('articles');
        let newCount = 0;
        let pending = articles.length;

        if (pending === 0) { resolve(0); return; }

        for (const article of articles) {
          const key = [feedId, article.link] as unknown as IDBValidKey;
          const check = store.get(key);
          check.onsuccess = () => {
            if (!check.result) {
              // New article — store minimal record
              store.put({
                ...article,
                id: btoa(article.link).slice(0, 16),
                description: '',
                pubDate: '',
                imageUrls: [],
                cachedAt: Date.now(),
              });
              newCount++;
            }
            pending--;
            if (pending === 0) resolve(newCount);
          };
          check.onerror = () => {
            pending--;
            if (pending === 0) resolve(newCount);
          };
        }
      } catch {
        db.close();
        resolve(0);
      }
    };
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
