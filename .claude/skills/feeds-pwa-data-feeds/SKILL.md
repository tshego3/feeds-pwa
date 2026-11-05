---
name: feeds-pwa-data-feeds
description: Data layer, feed fetching, PWA, and client-side security rules for feeds-pwa. Use when touching IndexedDB (src/db/), RSS/XML fetching or parsing (src/feed/), the CORS proxy chain, OpenGraph images, the service worker (src/sw.ts), the manifest, offline caching, or anything security-sensitive (XSS, sanitization, dependencies, external input).
---

# Data Layer, Feed Fetching, PWA, and Security Rules

## Data Layer (IndexedDB)

1. Database name: `feeds-db`. Object stores: `subscriptions` (feed records), `articles` (cached feed items, key `[feedId, link]`), `bookmarks` (saved articles, key `link`), `lessons` (micro-learning lessons, key `link`, capped at 100), `learningDays` (streak days, key local `YYYY-MM-DD`, with `ideasViewed`), `ideas` (saved feed ideas with review schedule), `catalogCache` (API bodies with a TTL), `feedSeen` (seen feed cards). Schema version 4. Lessons cap: 100 articles, 30 books.
2. Use the `idb` wrapper library for all IndexedDB operations - no raw IndexedDB API.
3. All CRUD logic lives in `src/db/` - no database operations in component or screen files.
4. Operations: add/remove subscription, fetch and cache articles, get articles by feed, search articles, save/unsave bookmarks, clear cache, toggle `suppressHeroImage` per feed.
5. Export/import subscriptions as JSON/OPML for backup (Settings screen).
6. Seed default feeds from `public/feeds.json` on first launch when db is empty (mirrors native DefaultFeeds.swift).

### Core Models (src/types/, mirrors native Swift models)

```typescript
interface RssFeedModel {
  readonly id: number;
  readonly title: string;
  readonly url: string;
  readonly suppressHeroImage: boolean;
  readonly groupId?: string;
  readonly groupTitle?: string;
  readonly sortOrder: number;
}

type FeedMenuItem =
  | { type: 'single'; feed: RssFeedModel }
  | { type: 'group'; id: string; title: string; feeds: RssFeedModel[] };

interface FeedItem {
  readonly id: string;           // Generated from link hash
  readonly feedId: number;
  readonly title: string;
  readonly link: string;
  readonly description: string;  // HTML-stripped plain text
  readonly pubDate: string;
  readonly imageUrls: string[];  // From enclosure/media:content/media:thumbnail/og:image
  readonly cachedAt: number;
}

interface SavedArticle {
  readonly id: string;
  readonly feedId: number;
  readonly title: string;
  readonly link: string;
  readonly description: string;
  readonly pubDate: string;
  readonly imageUrl?: string;
  readonly savedAt: number;
}
```

## Feed Fetching (src/feed/fetcher.ts)

1. All fetch logic lives in `src/feed/` - components never call `fetch()` directly for RSS data.
2. Fetch strategy (all shared helpers live in `src/feed/proxy.ts`):
   - **Tier 1**: the self-hosted Cloudflare Worker proxy (`proxy/cors-proxy-worker.js`, deployed as `feeds-proxy`) - it passes the Cloudflare bot checks that block public proxies and serves a 5-minute edge cache. It is the ONLY proxy; the old public tiers (Netlify, AllOrigins, Codetabs) were removed deliberately.
   - **Tier 2**: direct fetch - the fallback when the Worker is unreachable; works when the feed sends CORS headers.
   - The Worker allows the production origin (`https://tshego3.github.io`) plus `http://localhost:*` / `http://127.0.0.1:*` for dev; all other origins are rejected with 403.
3. Always URL-encode the feed URL when passing to the proxy (`buildProxyUrl` does this). 15-second `AbortController` timeout per request via `fetchWithTimeout`.
4. Validate every response body looks like RSS/Atom/RDF before accepting - proxies return HTML error pages with 200 status.
5. Handle partial failures gracefully - display available articles even if some feeds fail. Typed error categories: `network`, `parsing`, `unavailable` (with status).

## Feed Parsing (src/feed/parser.ts)

1. Parse XML with `DOMParser` - no external XML parsing libraries.
2. Extract per item (mirrors native RSSXMLParser.swift): title, link, description (HTML-stripped for preview), pubDate, image URLs from `<enclosure>`, `<media:content>`, `<media:thumbnail>`, `<content:encoded>` img tags, `<image>` elements.
3. Use `getElementsByTagNameNS('*', ...)` for namespaced elements (media:content etc.).

## OpenGraph Images (src/feed/opengraph.ts)

1. If a feed item has no image, fetch `og:image` from the article HTML (mirrors native OpenGraphService.swift). Decode HTML entities in extracted URLs.
2. Cache resolved OG images in memory per session (Map, including null results).
3. Image resolution priority (mirrors native ImageResolver): (1) `imageUrls[0]`, (2) og:image. Respect `suppressHeroImage` per feed.

## PWA Rules

1. Previously fetched articles must remain accessible offline (IndexedDB cache + SW runtime caching).
2. Service Worker (`src/sw.ts`) uses Workbox precaching for static assets plus runtime caching. Note: the SW bundles `src/feed/fetcher.ts` for background refresh - a stale SW keeps old fetch logic until it updates. Runtime caches are Workbox `CacheFirst` routes: `images-v2` (200 entries, 30 days) and `lesson-html-v1` (proxy requests tagged `purpose=lesson`, 50 entries, 14 days). Feed XML never goes through a cache-first route. Learning routes: `book-text-v1` (proxy `purpose=book`, CacheFirst, 60 days), `wiki-featured-v1` (NetworkFirst, 5 s). The Wikipedia Action API and Open Trivia DB are not routed: topic bodies are TTL-cached and trivia questions pooled in IndexedDB.
3. Web Push: `push-worker/` (Cloudflare Worker, KV + 15-min cron) sends payload-free VAPID pushes when a subscribed feed has a new article; the SW's `push` handler fetches feeds itself and MUST always show a notification (userVisibleOnly contract - repeated silent pushes get the subscription revoked). The client half is `src/notifications/push.ts`; its VAPID public key must match `push-worker/wrangler.toml`, and its MAX_FEEDS must stay <= the worker's MAX_FEEDS_PER_SUB.
4. The SW opens IndexedDB with raw `indexedDB.open(DB_NAME)` (no version, since `src/db/index.ts` owns the schema/version): always close connections when the transaction completes, set `onversionchange` to close, and abort in `onupgradeneeded` so the SW never creates an empty DB. When changing the schema in `src/db/index.ts`, audit `src/sw.ts`'s writers for drift (e.g. new required fields like `cachedAt`).
5. Manifest (`public/manifest.webmanifest`): app name "feeds", SVG icon (any + maskable), `display: standalone`, `theme_color: #131313`.
6. Installable on mobile and desktop; "Add to Home Screen" optimized.
7. Show a subtle offline indicator banner when the device is offline.

## Learning Feed Sources

1. Never request `www.gutenberg.org` at runtime; its site is for human users only. Book lists come from the generated `public/learning/books.json`; book text and covers come from mirrors (`mirror.cs.odu.edu`, `gutenberg.pglaf.org`). Mirror text goes through the proxy (no CORS).
2. Regenerate `books.json` with `npm run catalog` at most once a week.
3. Wikipedia (CC BY-SA 4.0) and Open Trivia DB (CC BY-SA 4.0) cards must show `SourceAttribution`.
4. All learning API calls go through `src/learning/http.ts` host limits. Send `Api-User-Agent` to Wikimedia.

## Security Rules (Client-Side)

1. Never store secrets, API keys, or credentials in source code or localStorage. Third-party keys go through `import.meta.env.VITE_*`; never commit `.env` files with real keys.
2. Sanitize RSS/user content before rendering to prevent XSS. Use `textContent` over `innerHTML` unless deliberately rendering trusted markup. Strip or sanitize HTML from `<description>` and `<content:encoded>`.
3. No `eval()`, `Function()`, or `document.write()`.
4. `rel="noopener noreferrer"` on all external links with `target="_blank"`.
5. Validate all external input (URL strings, JSON payloads, RSS content) before use. Client-side form validation is UX only, never a security boundary.
6. Vet all dependencies before adoption: exists on npmjs.com, legitimate publisher, no CVEs, active maintenance, clear MIT/Apache license. Never trust AI-suggested package names blindly - they may be typosquatted.
7. Error messages must not leak internals (stack traces, raw errors, file paths).
