---
name: feeds-pwa-data-feeds
description: Data layer, feed fetching, PWA, and client-side security rules for feeds-pwa. Use when touching IndexedDB (src/db/), RSS/XML fetching or parsing (src/feed/), the CORS proxy chain, OpenGraph images, the service worker (src/sw.ts), the manifest, offline caching, or anything security-sensitive (XSS, sanitization, dependencies, external input).
---

# Data Layer, Feed Fetching, PWA, and Security Rules

## Data Layer (IndexedDB)

1. Database name: `feeds-db`. Object stores: `subscriptions` (feed records), `articles` (cached feed items, key `[feedId, link]`), `bookmarks` (saved articles, key `link`).
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
2. Fetch strategy (mirrors native FeedService.swift, upgraded for proxy flakiness):
   - **Tier 1**: direct fetch - fastest when the feed sends CORS headers, fails instantly when it doesn't.
   - **Tier 2**: all proxy tiers raced **in parallel**; first response that validates as feed XML wins, the rest are aborted. Tiers: optional custom Cloudflare Worker (`CUSTOM_PROXY`, most reliable for Cloudflare-protected feeds), Netlify proxy (`rss-proxy-api.netlify.app`), AllOrigins raw, Codetabs, AllOrigins JSON.
3. Always URL-encode the feed URL when passing to proxies. 15-second `AbortController` timeout per request.
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
2. Service Worker (`src/sw.ts`) uses Workbox precaching for static assets plus runtime caching. Note: the SW bundles `src/feed/fetcher.ts` for background refresh - a stale SW keeps old fetch logic until it updates.
3. Manifest (`public/manifest.webmanifest`): app name "feeds", SVG icon (any + maskable), `display: standalone`, `theme_color: #131313`.
4. Installable on mobile and desktop; "Add to Home Screen" optimized.
5. Show a subtle offline indicator banner when the device is offline.

## Security Rules (Client-Side)

1. Never store secrets, API keys, or credentials in source code or localStorage. Third-party keys go through `import.meta.env.VITE_*`; never commit `.env` files with real keys.
2. Sanitize RSS/user content before rendering to prevent XSS. Use `textContent` over `innerHTML` unless deliberately rendering trusted markup. Strip or sanitize HTML from `<description>` and `<content:encoded>`.
3. No `eval()`, `Function()`, or `document.write()`.
4. `rel="noopener noreferrer"` on all external links with `target="_blank"`.
5. Validate all external input (URL strings, JSON payloads, RSS content) before use. Client-side form validation is UX only, never a security boundary.
6. Vet all dependencies before adoption: exists on npmjs.com, legitimate publisher, no CVEs, active maintenance, clear MIT/Apache license. Never trust AI-suggested package names blindly - they may be typosquatted.
7. Error messages must not leak internals (stack traces, raw errors, file paths).
