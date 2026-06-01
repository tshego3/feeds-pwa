
# Agent Skills (TypeScript + Vite + Mantine PWA)

This document defines what an AI coding agent is expected to do well in this repository.

## Architecture Overview

This project is **feeds-pwa** — the web PWA spin-off of the native Swift [feeds](/Users/netuser/Projects/feeds) project (iOS/macOS/Android RSS reader). Built with TypeScript, Vite, and Mantine UI. Feed data is fetched over the network via CORS proxies (direct -> Netlify -> Codetabs fallback chain, mirroring the native `FeedService.swift`). Subscriptions, cached articles, and bookmarks persist locally via IndexedDB.

```
feeds-pwa/
  public/
    manifest.webmanifest   -- PWA manifest (name "feeds", SVG icon, theme_color, display: standalone)
    favicon.svg            -- App icon (SVG, used for all PWA icon purposes)
    feeds.json             -- Default/seed feed subscriptions (mirrors native DefaultFeeds.swift)
  src/
    types/                 -- RssFeedModel, FeedMenuItem, FeedItem, SavedArticle interfaces
    db/                    -- IndexedDB setup and CRUD (idb wrapper): subscriptions, articles, bookmarks
    feed/                  -- XML fetch, parse, proxy fallback, OpenGraph image resolution
    theme/                 -- Mantine theme override (mirrors native Theme.swift)
    components/            -- FeaturedArticleCard, ArticleCard, CompactArticleRow, FeedSidebar
    screens/               -- Dashboard, FeedView, Search, Bookmarks, Settings, ManageFeeds
    sw.ts                  -- Service Worker (Workbox precaching + article cache)
    main.ts                -- App entry with MantineProvider and router
```

**Golden rules:**
- No server-side code, no API endpoints, no remote database. IndexedDB is the sole local data layer.
- RSS feeds are fetched via proxy fallback chain (mirrors native FeedService): direct -> Netlify proxy -> Codetabs proxy.
- All design tokens originate from `src/theme/` (mirrors native Theme.swift with Monolithic Clarity dark palette).
- No hardcoded colors, font families, or spacing in components -- use Mantine theme tokens or CSS variables.
- All CRUD logic lives in `src/db/` -- no database operations in component or screen files.
- All fetch/parse logic lives in `src/feed/` -- components never call `fetch()` directly for RSS data.
- Routing is client-side hash router or lightweight vanilla router.
- Functional TypeScript with module pattern. No class-based patterns.
- Color palette: Charcoal (#131313) background, Graphite (#1C1C1C) surface, Slate Gray (#2D2D2D) elevated, Off-White (#F5F5F5) text, White (#FFFFFF) accent.
- Typography: **Inter** exclusively for all text.
- All visual assets must be real -- strictly no AI-generated images.
- PWA: offline reading of cached articles, installable, Service Worker caches static assets and article data.
- Feature parity goal with native feeds app: bento card grid, sidebar navigation, bookmarks, article reading view, feed management, appearance modes.

## Core Delivery Skills

1. Build UI using Mantine's component library with the Monolithic Clarity dark theme (mirrors native Theme.swift).
2. Implement RSS/XML feed fetching with proxy fallback chain in `src/feed/` (mirrors native `FeedService.swift`).
3. Parse XML responses using `DOMParser` to extract `FeedItem` data (mirrors native `RSSXMLParser.swift`): title, link, description, pubDate, image URLs from enclosure/media:content/media:thumbnail/content:encoded.
4. Implement IndexedDB CRUD operations via the `idb` wrapper library in `src/db/` for subscriptions, cached articles, and bookmarks.
5. Maintain centralized theming -- all design tokens flow from `src/theme/` through MantineProvider.
6. Implement responsive, mobile-first layouts using Mantine components and min-width media queries.
7. Display articles in a bento-style layout (mirrors native `DashboardView`): FeaturedArticleCard + ArticleCard grid + CompactArticleRow list.
8. Implement hierarchical feed sidebar navigation (mirrors native `FeedSidebar`): standalone feeds as rows, grouped feeds as expandable sections.
9. Write type-safe code with `strict: true` TypeScript -- explicit interfaces, strictly no `any`.
10. Maintain PWA functionality -- Service Worker, manifest, offline cached article reading.
11. Implement bookmark save/unsave with IndexedDB persistence (mirrors native `BookmarkStore`).
12. Implement OpenGraph image resolution fallback (mirrors native `OpenGraphService.swift` + `ImageResolver`).
13. Perform a mandatory compliance pass before completion: confirm changes align with `.github/copilot-instructions.md` and `docs/design-system.md`.

## Theme and Styling Skills

### Monolithic Clarity Dark Theme

1. All design tokens live in `src/theme/` -- the Mantine theme override consuming the dark palette from `docs/design-system.md`.
2. The theme is consumed by `MantineProvider` at app initialization. All colors, fonts, radii, and spacing derive from the theme config.
3. Components use Mantine theme tokens (`var(--mantine-color-*)`) or component props (`color`, `variant`, `size`) -- never hardcoded values.
4. If a component needs a design token in TypeScript, import from `src/theme/` -- never inline the value.

### Styling Patterns

5. Use Mantine's built-in styling: component props and the `style` prop referencing theme tokens.
6. No `.module.css` files. Centralize style objects if needed and import them.
7. No hardcoded color values in components. All colors must reference theme tokens.
8. Depth is conveyed through tonal layering only -- no shadows.
9. Glassmorphism for overlays: 80% opacity + 20px backdrop blur with 1px Slate Gray border.

## Data Layer Skills (IndexedDB)

1. Use the `idb` wrapper library for all IndexedDB operations -- no raw IndexedDB API.
2. Database name: `feeds-db`. Object stores: `subscriptions`, `articles`, `bookmarks`.
3. Implement operations: add/remove feed subscription, cache articles, get articles by feed, search articles, save/unsave bookmarks, toggle `suppressHeroImage`, clear cache.
4. All CRUD logic is encapsulated in `src/db/` -- screens and components call db functions, never touch IndexedDB directly.
5. Export/import subscriptions as JSON/OPML for backup functionality.
6. Seed default feeds from `public/feeds.json` on first launch when db is empty (mirrors native `DefaultFeeds.swift`).

## Feed Fetching and Parsing Skills

1. Fetch RSS/XML using proxy fallback chain (mirrors native `FeedService`): direct fetch -> Netlify proxy -> Codetabs proxy. 15-second timeout per request.
2. Always URL-encode feed URLs when passing to proxies.
3. Parse XML using `DOMParser` (mirrors native `RSSXMLParser.swift`) -- extract title, link, description, pubDate, image URLs from feed items.
4. Extract images from `<enclosure>`, `<media:content>`, `<media:thumbnail>`, `<content:encoded>` img tags, and `<image>` elements.
5. Handle partial failures gracefully -- display available articles even if some feeds fail. Use typed error categories (network, parsing, feed unavailable).
6. Strip HTML from descriptions for safe preview rendering (mirrors native `Helpers.stripHTML`).
7. All fetch/parse logic lives in `src/feed/` -- components never call `fetch()` directly.
8. OpenGraph image resolution: if feed item has no image, fetch `og:image` from article HTML (mirrors native `OpenGraphService.swift`). Handle HTML entity decoding in URLs.
9. Image resolution priority (mirrors native `ImageResolver`): (1) feed item imageUrls[0], (2) og:image. Respect `suppressHeroImage` flag. Cache resolved URLs in memory per session.

## Mantine UI Skills

1. Use Mantine components (`Paper`, `Card`, `AppShell`, `TextInput`, `ActionIcon`, `Modal`, etc.) for all UI.
2. Consult https://mantine.dev/core/ before implementing any UI pattern.
3. Apply the Monolithic Clarity theme via `MantineProvider` at the app root.
4. Use Mantine hooks (`useMediaQuery`, `useDisclosure`, etc.) for responsive behavior and UI state.
5. Never override `MantineProvider` in child components.
6. Use `@tabler/icons-react` for all UI icons.

## Component Patterns

### RssFeedModel Type

```typescript
// src/types/index.ts (mirrors native RssFeedModel.swift + FeedRecord.swift)
export interface RssFeedModel {
  readonly id: number;
  readonly title: string;
  readonly url: string;
  readonly suppressHeroImage: boolean;
  readonly groupId?: string;
  readonly groupTitle?: string;
  readonly sortOrder: number;
}

// Hierarchical menu structure (mirrors native FeedMenuItem enum)
export type FeedMenuItem =
  | { type: 'single'; feed: RssFeedModel }
  | { type: 'group'; id: string; title: string; feeds: RssFeedModel[] };

export interface FeedItem {
  readonly id: string;           // Generated from link hash
  readonly feedId: number;
  readonly title: string;
  readonly link: string;
  readonly description: string;  // HTML-stripped plain text
  readonly pubDate: string;
  readonly imageUrls: string[];  // From enclosure/media:content/media:thumbnail/og:image
  readonly cachedAt: number;
}

export interface SavedArticle {
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

### Database Module Pattern

```typescript
// src/db/subscriptions.ts
import { openDB } from 'idb';
import type { RssFeedModel } from '../types';

const DB_NAME = 'feeds-db';
const DB_VERSION = 1;
const STORE_NAME = 'subscriptions';

function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('articles')) {
        db.createObjectStore('articles', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('bookmarks')) {
        db.createObjectStore('bookmarks', { keyPath: 'id' });
      }
    },
  });
}

export async function getAllSubscriptions(): Promise<RssFeedModel[]> {
  const db = await getDb();
  return db.getAll(STORE_NAME);
}

export async function addSubscription(feed: RssFeedModel): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, feed);
}

export async function removeSubscription(id: number): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}
```

### Feed Fetcher Pattern

```typescript
// src/feed/fetcher.ts (mirrors native FeedService.swift 3-tier strategy)
import type { RssFeedModel } from '../types';

const NETLIFY_PROXY = 'https://rss-proxy-api.netlify.app/.netlify/functions/fetch-xml?url=';
const CODETABS_PROXY = 'https://api.codetabs.com/v1/proxy/?quest=';
const TIMEOUT_MS = 15_000;

export type FeedError =
  | { type: 'network'; message: string }
  | { type: 'parsing'; message: string }
  | { type: 'unavailable'; status: number };

export async function fetchFeedXml(feed: RssFeedModel): Promise<string> {
  const encodedUrl = encodeURIComponent(feed.url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // Primary: Direct fetch
    let response = await fetch(feed.url, { signal: controller.signal });
    if (response.ok) return response.text();

    // Secondary: Netlify proxy
    response = await fetch(`${NETLIFY_PROXY}${encodedUrl}`, { signal: controller.signal });
    if (response.ok) return response.text();

    // Tertiary: Codetabs proxy
    response = await fetch(`${CODETABS_PROXY}${encodedUrl}`, { signal: controller.signal });
    if (response.ok) return response.text();

    throw new Error(`Failed to fetch feed: ${feed.title}`);
  } finally {
    clearTimeout(timeout);
  }
}
```

### XML Parser Pattern

```typescript
// src/feed/parser.ts (mirrors native RSSXMLParser.swift)
import type { FeedItem } from '../types';

export function parseRssXml(xml: string, feedId: number): FeedItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const items = doc.querySelectorAll('item');

  return Array.from(items).map((item) => ({
    id: generateId(item.querySelector('link')?.textContent ?? ''),
    feedId,
    title: item.querySelector('title')?.textContent ?? '',
    link: item.querySelector('link')?.textContent ?? '',
    description: stripHtml(item.querySelector('description')?.textContent ?? ''),
    pubDate: item.querySelector('pubDate')?.textContent ?? '',
    imageUrls: extractImageUrls(item),
    cachedAt: Date.now(),
  }));
}

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.textContent = html;
  return tmp.textContent ?? '';
}

function extractImageUrls(item: Element): string[] {
  const urls: string[] = [];
  // Check enclosure (mirrors native parser)
  const enclosure = item.querySelector('enclosure[type^="image"]');
  if (enclosure?.getAttribute('url')) urls.push(enclosure.getAttribute('url')!);
  // Check media:content
  const media = item.getElementsByTagNameNS('*', 'content');
  for (const m of Array.from(media)) {
    const url = m.getAttribute('url');
    if (url?.match(/\.(jpg|jpeg|png|gif|webp)/i)) urls.push(url);
  }
  // Check media:thumbnail
  const thumbnails = item.getElementsByTagNameNS('*', 'thumbnail');
  for (const t of Array.from(thumbnails)) {
    const url = t.getAttribute('url');
    if (url) urls.push(url);
  }
  return urls;
}

function generateId(link: string): string {
  let hash = 0;
  for (const char of link) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }
  return hash.toString(36);
}
```

### Theme Pattern

```typescript
// src/theme/index.ts
import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'gray',
  fontFamily: 'Inter, sans-serif',
  colors: {
    dark: [
      '#F5F5F5',  // text
      '#999999',  // muted
      '#2D2D2D',  // elevated / slate gray
      '#1C1C1C',  // surface / graphite
      '#131313',  // canvas / charcoal
      '#0e0e0e',  // deepest
      '#131313',
      '#1C1C1C',
      '#2D2D2D',
      '#353534',
    ],
  },
  radius: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
});
```

### OpenGraph Service Pattern

```typescript
// src/feed/opengraph.ts (mirrors native OpenGraphService.swift)
const ogCache = new Map<string, string | null>();

export async function fetchOGImageUrl(articleUrl: string): Promise<string | null> {
  if (ogCache.has(articleUrl)) return ogCache.get(articleUrl) ?? null;

  try {
    const response = await fetch(articleUrl);
    if (!response.ok) return null;
    const html = await response.text();
    const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    const url = match?.[1] ? decodeHtmlEntities(match[1]) : null;
    ogCache.set(articleUrl, url);
    return url;
  } catch {
    ogCache.set(articleUrl, null);
    return null;
  }
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&amp;/g, '&');
}
```

### App Entry Pattern

```typescript
// src/main.ts
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { theme } from './theme';

// Initialize MantineProvider with Monolithic Clarity theme
// Set up hash router for screen navigation
// Register Service Worker for offline caching of articles
```

### Screen Pattern

```typescript
// src/screens/Dashboard.ts (mirrors native DashboardView.swift)
import { fetchFeedXml } from '../feed/fetcher';
import { parseRssXml } from '../feed/parser';
import { cacheArticles, getCachedArticles } from '../db/articles';
import type { RssFeedModel, FeedItem } from '../types';

export async function renderDashboard(
  container: HTMLElement,
  feed: RssFeedModel
): Promise<void> {
  // Show loading skeletons
  // Attempt to fetch fresh articles
  // Fall back to cached articles if offline
  // Render bento layout: FeaturedArticleCard + ArticleCard grid + CompactArticleRow list
  // Respect suppressHeroImage per feed
  // Bookmark toggle on each card
}
```

## PWA Skills

1. Service Worker uses Workbox for precaching all static assets and runtime caching of article data (`src/sw.ts`).
2. Web App Manifest includes: app name "feeds", SVG icon (any + maskable), `display: standalone`, `theme_color: #131313`.
3. Previously fetched articles remain accessible offline via IndexedDB cache.
4. Mobile "Add to Home Screen" optimized with standalone display and themed status bar.
5. Configure `vite.config.ts` with `base: '/feeds-pwa/'` for GitHub Pages deployment.
6. Show offline indicator banner when network is unavailable.

## Security Skills (Client-Side)

1. Never store secrets or API keys in source code or localStorage.
2. Use `import.meta.env.VITE_*` for any third-party API keys -- never commit `.env` files.
3. Use `textContent` over `innerHTML` to prevent XSS. Sanitize RSS content (strip HTML from descriptions).
4. Do not use `eval()`, `Function()`, or `document.write()`.
5. Set `rel="noopener noreferrer"` on external links with `target="_blank"`.
6. Validate form inputs client-side for UX; never trust client validation as a security boundary.
7. **Vet all dependencies before adoption**: verify existence on npmjs.com, confirm legitimate publisher, check for CVEs, review maintenance activity, prefer MIT/Apache 2.0 licensed packages.
8. Validate all external input (URL strings, JSON payloads, RSS XML content) before use.
9. Ensure error messages do not leak internal details (stack traces, file paths, raw error objects).

## Quality and Maintenance Skills

1. Run `npm run build` after changes to verify zero TypeScript errors and successful build.
2. Add or update Vitest tests when behavior changes (db operations, utilities, parsing).
3. Keep edits minimal, scoped, and style-consistent with nearby code.
4. Avoid unrelated refactors while implementing requested changes.
5. Resolve all ESLint errors and TypeScript strict-mode violations before completion.
6. Strictly no `any` types -- use explicit interfaces for all data models.
7. Keep functions short (<=40 lines) and focused on one concern.
8. Use direct, descriptive naming for functions, variables, and files.
9. Apply DRY -- reuse existing utilities and db functions before creating duplicates.
10. If code cannot be understood quickly without comments, simplify first.
11. Functional TypeScript with module pattern. No class-based patterns unless justified.
12. Clean code. No em dashes or emojis in comments.
13. Code is liability -- every line must justify its existence. Pursue the smallest diff that solves the problem.
14. If hardcoded mock/placeholder data is found, replace it with service calls or `// TODO:` stubs before completion.
15. Avoid unnecessary conditionals -- prefer ternary, early returns, nullish coalescing (`??`), and optional chaining (`?.`) over redundant `if` blocks.
16. Prefer `async/await` over callback-based or `.then()` chains.
17. Ensure failures surface a user-safe message with a clear next step -- never expose raw errors.
18. Treat compiler/linter warnings as errors -- resolve all before completion.

## Testing Skills

1. Use Vitest for unit tests, co-located with source files (`feed/parser.test.ts`).
2. Test XML parsing logic (various RSS/Atom formats, edge cases).
3. Test IndexedDB operations (subscriptions CRUD, article caching, bookmarks).
4. Test proxy fallback behavior (mock fetch responses).
5. Test pure utility functions and data transformation logic.
6. Test state management: verify `isLoading` is false after completion, `errorMessage` is set on failure and null on success.
7. Name tests descriptively: `describe('parseRssXml')` -> `it('extracts title, link, and pubDate from RSS 2.0 item')`.
8. Name tests with pattern: `test[Function]_[scenario]_[expectedResult]` for readability.

### Test Pattern

```typescript
// src/feed/parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseRssXml } from './parser';

const mockRssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Test Article</title>
      <link>https://example.com/article-1</link>
      <description>A test article description</description>
      <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
      <enclosure url="https://example.com/image.jpg" type="image/jpeg" />
    </item>
  </channel>
</rss>`;

describe('parseRssXml', () => {
  it('extracts feed items from valid RSS 2.0 XML', () => {
    const items = parseRssXml(mockRssXml, 1);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Test Article');
    expect(items[0].link).toBe('https://example.com/article-1');
    expect(items[0].imageUrls).toContain('https://example.com/image.jpg');
  });

  it('returns empty array for invalid XML', () => {
    const items = parseRssXml('<invalid>', 1);
    expect(items).toHaveLength(0);
  });
});
```

### State Management Test Pattern

```typescript
// src/screens/__tests__/feedState.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadFeed } from '../feedState';

describe('loadFeed', () => {
  it('sets isLoading false after successful fetch', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('<rss><channel><item><title>Test</title></item></channel></rss>')
    );

    const state = await loadFeed({ id: 1, title: 'Test', url: 'https://example.com/rss', suppressHeroImage: false, sortOrder: 0 });

    expect(state.isLoading).toBe(false);
    expect(state.errorMessage).toBeNull();
    expect(state.items.length).toBeGreaterThan(0);
  });

  it('sets user-safe error message on network failure', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const state = await loadFeed({ id: 1, title: 'Test', url: 'https://example.com/rss', suppressHeroImage: false, sortOrder: 0 });

    expect(state.isLoading).toBe(false);
    expect(state.errorMessage).toBe('Network error. Please check your connection.');
    expect(state.items).toEqual([]);
  });
});
```

## Gold Standard State Management Skills

**Mandatory pattern** for all screens that fetch and display async data (mirrors native SwiftUI 4-branch pattern).

### State Structure (Complete Checklist)

```typescript
// Every async data-loading module must manage:
interface FeedScreenState {
  items: FeedItem[];           // raw data from service, always initialized to []
  isLoading: boolean;          // true during fetch
  errorMessage: string | null; // user-safe error, null on success
  searchText: string;          // user input for filtering
  selectedCategory?: string;   // optional category filter
}

// COMPUTED (derived, never stored):
const filteredItems = items.filter(/* search + category logic */);
const hasItems = items.length > 0;
const resultCount = filteredItems.length;
```

### 4-Branch Rendering (Exact Order)

```typescript
if (isLoading) {
  // BRANCH 1: LOADING — show skeleton/spinner
  return <Skeleton />;
} else if (errorMessage) {
  // BRANCH 2: ERROR — show message + retry
  return <ErrorState message={errorMessage} onRetry={refresh} />;
} else if (hasItems) {
  // BRANCH 3: DATA — show content + filters
  return <FeedGrid items={filteredItems} />;
} else {
  // BRANCH 4: EMPTY — show guidance
  return <EmptyState message="No articles found. Select a feed to get started." />;
}
```

### Async Data Loading Pattern

```typescript
async function loadFeed(feed: RssFeedModel): Promise<FeedScreenState> {
  const state: FeedScreenState = { items: [], isLoading: true, errorMessage: null, searchText: '' };

  try {
    const xml = await fetchFeedXml(feed);
    state.items = parseRssXml(xml, feed.id);
  } catch (error) {
    if (error instanceof TypeError) {
      state.errorMessage = 'Network error. Please check your connection.';
    } else if (error && typeof error === 'object' && 'type' in error) {
      const feedError = error as FeedError;
      if (feedError.type === 'parsing') state.errorMessage = 'Unable to read feed data.';
      else if (feedError.type === 'unavailable') state.errorMessage = `Feed unavailable (${feedError.status}).`;
      else state.errorMessage = 'Something went wrong. Please try again.';
    } else {
      state.errorMessage = 'Something went wrong. Please try again.';
    }
    state.items = [];
  } finally {
    state.isLoading = false;
  }

  return state;
}
```

### Gold Standard Rules Checklist

1. **Initialization** — set `isLoading = true` at start, `false` in `finally`. Initialize all arrays to `[]`.
2. **Error Handling** — use typed catches: `TypeError` for network, typed errors for parsing/unavailable, catch-all for unexpected. Always set user-safe `errorMessage`.
3. **Computed Properties** — all filter/search results must be computed (never stored). Use `hasItems` computed, not inline `items.length > 0` in templates.
4. **State Branches** — always render in exact order: Loading -> Error -> Data -> Empty.
5. **Filtering** — store user input in state (`searchText`, `selectedCategory`). Implement filter logic as pure computed derivations.
6. **Retry** — always provide a "Try Again" action in error state.

### Anti-Patterns (State Management)

- DO NOT: Display `items` directly -- use `filteredItems` computed derivation
- DO NOT: Set `isLoading = false` in multiple places -- use `finally`
- DO NOT: Catch errors silently -- always set `errorMessage` or log
- DO NOT: Show raw error messages to users -- translate to safe messages
- DO NOT: Render without checking `isLoading` -- always use 4 branches
- DO NOT: Mix filter logic in components -- keep it in service/hook layer
- DO NOT: Use non-null assertion (`!`) on state values -- use optional chaining or guards
- DO NOT: Store computed results in state -- derive them fresh on each render

## Reliability and Robustness Skills

1. Follow robust coding principles: simple control flow, bounded iterations, small functions, guard clauses.
2. Use context-rich typed errors, defensive logging, and fail-fast patterns.
3. Never use empty `catch { }` blocks -- always handle or log errors.
4. Prefer composition over inheritance -- use interfaces and pure functions for abstraction.
5. Use value-oriented data (readonly interfaces) for models, mutable state only where required.
6. Keep data models immutable -- create new objects rather than mutating when practical.
7. Test service functions by mocking `fetch` responses for deterministic behavior.
8. Timeouts on all network calls via `AbortController` -- never let a request hang indefinitely.
9. Separate pure logic from I/O -- pure functions are trivial to unit test.
10. No global mutable state -- use module-scoped state or React context for shared state.

## Typical Skill Applications

1. Add new feed subscriptions with XML fetching and article display.
2. Implement bento-style dashboard layout (FeaturedArticleCard + grid + compact rows).
3. Build hierarchical feed sidebar navigation with expandable groups.
4. Implement proxy fallback chain for CORS-restricted feeds.
5. Cache articles in IndexedDB for offline reading.
6. Implement bookmark save/unsave with persistence.
7. Implement OpenGraph image resolution fallback for feeds without images.
8. Build article reading view with theme-aware HTML rendering.
9. Implement feed management (add/delete/toggle suppressHeroImage).
10. Export/import feed subscriptions as JSON/OPML for backup.
11. Implement appearance mode cycling (Auto/Light/Dark/Monochrome).
12. Auto-refresh with "New Articles" banner notification.
13. Maintain PWA behavior through Service Worker updates.
14. Update theme tokens when design system evolves.

## Accessibility Skills

1. Use semantic HTML elements (`<nav>`, `<main>`, `<section>`, `<button>`) -- no `<div>` for interactive elements.
2. All form inputs must have associated `<label>` elements.
3. Maintain keyboard navigability -- Mantine components support this by default; do not break it.
4. Use ARIA attributes only when Mantine's built-in accessibility is insufficient.
5. Ensure color contrast meets WCAG AA (4.5:1 minimum) on the dark theme.
6. Touch targets minimum 44px for mobile accessibility.
7. Respect `prefers-reduced-motion` -- Mantine handles this; do not override.

## Performance Skills

1. Use dynamic `import()` for screens and heavy modules to enable Vite code splitting.
2. Keep bundle lean -- import only needed Mantine components, not the entire library.
3. Service Worker must cache all static assets for instant load on repeat visits.
4. Audit bundle with `npx vite-bundle-visualizer` before major deploys.
5. Avoid render-blocking resources; defer non-critical scripts and assets.
6. Lazy-load article hero images below the fold.
7. Paginate or virtualize long article lists to avoid rendering hundreds of DOM nodes.

## Anti-Patterns (Explicitly Forbidden)

- DO NOT: Hardcode colors/fonts in component files -- use Mantine theme tokens or CSS variables
- DO NOT: Call fetch() for RSS data outside of `src/feed/` -- all network logic is centralized there
- DO NOT: Use `any` type -- use explicit interfaces and types
- DO NOT: Create custom UI components when Mantine provides an equivalent
- DO NOT: Override `MantineProvider` in child components
- DO NOT: Put CRUD logic in component or screen files -- all db operations live in `src/db/`
- DO NOT: Use raw IndexedDB API -- use the `idb` wrapper library
- DO NOT: Store sensitive data in localStorage or source code
- DO NOT: Use `var` declarations -- use `const` or `let`
- DO NOT: Use shadows for elevation -- use tonal layering only
- DO NOT: Use class-based patterns -- functional TypeScript with modules
- DO NOT: Skip the compliance check against `copilot-instructions.md` before finalizing. **Compliance check must also audit**: (a) all packages are from legitimate publishers, (b) no outdated/unmaintained deps, (c) no known CVEs, (d) no hardcoded secrets, (e) all network calls use HTTPS + timeouts, (f) error messages don't leak internals
- DO NOT: Generate, create, or use AI-generated images/assets -- all visual assets must be real
- DO NOT: Deviate from native feeds app behavior without justification -- this is a web port
- DO NOT: Display raw data directly in components -- use filtered/computed derivations
- DO NOT: Set `isLoading = false` in multiple places -- use `finally`
- DO NOT: Catch errors silently (`catch { }`) -- always set error state or log
- DO NOT: Show raw error messages to users -- translate to safe, actionable messages
- DO NOT: Render without checking `isLoading` -- always use the 4-branch pattern
- DO NOT: Use non-null assertion (`!`) in production code -- use optional chaining or guards
- DO NOT: Add unnecessary conditionals -- prefer early returns, nullish coalescing, optional chaining

## Asset Rules (Strictly No AI Generation)

1. **All images and visual assets must be real** -- supplied by the business or from approved stock. Never use AI-generated images.
2. Use `@tabler/icons-react` for all UI icons (rss, news, bookmark, search, settings, etc.).
3. PWA icon is `public/favicon.svg` (SVG, referenced by manifest for both `any` and `maskable` purposes).
4. If an image is missing, use a themed placeholder container with a `<!-- TODO: replace with real asset -->` comment.
5. Do not use AI image generation tools to create any asset for this project.

## Reference Documentation

| Document | Purpose |
|----------|---------|
| **copilot-instructions.md** | Core engineering rules, architecture, data layer, deployment |
| **skills/skill.md** (this file) | Agent capabilities, practical code patterns, testing strategies |
| **docs/design-system.md** | Monolithic Clarity visual tokens, typography, spacing, components |
| **Native feeds project** | Reference implementation for feature parity (Swift/SwiftUI) |

For fast onboarding:
1. Read **copilot-instructions.md** for rules and architecture
2. Review the native [feeds](/Users/netuser/Projects/feeds) project README for feature reference
3. Review `src/theme/` for current Monolithic Clarity design tokens
4. Review `src/types/` for the RssFeedModel, FeedMenuItem, FeedItem, SavedArticle interfaces
5. Use the patterns in this document as templates for new features