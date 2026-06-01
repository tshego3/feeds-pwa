## Phase 1: UI Generation (Google Stitch Prompt)

Copy and paste the following prompt into the Google Stitch interface to generate the design system and UI layout.

### The Prompt

> **Role**: Lead UI/UX Designer and Front-End Architect.
> **Project**: "Feeds PWA" - A modern dark-themed RSS feed reader web application (port of native Swift feeds app).
>
> **Design Requirements**:
>
> * **Core Directive:** ACTUALLY GENERATE THE SCREENS. Return structured UI layouts. Create visual hierarchy. Include components, spacing, and interactions. Do not explain the design. Do not describe intentions. Output only the generated UI structure.
> * **Brand Aesthetic:** Minimal Claude-inspired UI. Calm productivity-focused aesthetic with elegant typography and minimal visual noise. The interface should feel like a quiet, high-end digital workspace.
> * **Color Palette:**
>   - Background/Canvas: Charcoal (#131313)
>   - Surface: Graphite (#1C1C1C)
>   - Elevated: Slate Gray (#2D2D2D)
>   - Primary Text: Off-White (#F5F5F5)
>   - Secondary Text: Muted (#999999)
>   - Accent (subtle): White (#FFFFFF) for active states and indicators
> * **Typography:** Use **Inter** exclusively. Tight letter-spacing for headlines, generous 1.6 line-height for body.
> * **Visual Treatment:**
>   - Dark monochrome palette throughout
>   - Spacious layout with 4px baseline grid
>   - Rounded corners (8px standard, 16px cards, 24px outer wrappers)
>   - Soft 1px dividers using Slate Gray
>   - Subtle glassmorphism on overlays (80% opacity + 20px backdrop blur)
>   - No shadows. Depth through tonal layering only.
>
> * **Screens to Generate (Mobile-First):**
>   1. **Dashboard** - Bento-style article grid: featured article card (hero image + overlay title), standard grid cards (thumbnail + title + source + date), compact article rows. Bottom tab navigation. Pull-to-refresh.
>   2. **Feed View** - Articles from a single selected feed, same bento layout. Shows feed title in header. Empty state when no articles loaded.
>   3. **Article Reading View** - Full article with hero image, title, source, date, body text (HTML rendered). Bookmark toggle and share action in header. Back navigation.
>   4. **Search** - Top search bar with instant filter across all cached articles by title or description. Category filter chips.
>   5. **Bookmarks** - Saved articles list with thumbnail, title, source, and saved date. Swipe-to-remove.
>   6. **Settings** - Feed subscription management (list all feeds, swipe-to-delete, toggle hero image suppression), add feed form (title + URL + optional group), OPML export/import, clear cache.
>   7. **Feed Sidebar (Desktop)** - Collapsible left sidebar with grouped feed navigation: standalone feeds as direct rows, categorized feeds as expandable disclosure groups. Selected feed highlighted. Collapse to icons on narrow desktop.
>
> * **Required Layout Structure (Mobile-First, scales up to Desktop):**
>   - **Mobile (default):** Single-column, bottom tab navigation (Home, Search, Bookmarks, Settings), 16px container padding, cards stack vertically
>   - **Desktop (breakpoint up):** Left sidebar navigation (collapsible, icon + label, active indicator with 2px white left border), central content area (max-width 960px, 24px padding)
>   - Article cards showing title, source name, timestamp, and thumbnail image
>   - Featured article card: full-width hero image with overlay gradient and title at bottom
>   - Floating action button for adding feeds (mobile), inline button (desktop)
>   - Feed group sections (Sports, News, Tech, Reddit) as expandable sidebar groups
>   - Touch-optimized tap targets (min 44px hit area)
>
> **Deliverable**: High-fidelity screen layouts with full component structure, spacing values, and interaction states. Optimized for a pure PWA built with Vite + TypeScript + Mantine UI.

---

## Phase 2: Code Generation (MCP Stitch Prompt)

Once you have the Stitch Project ID, use this prompt to generate the functional codebase.

### The Prompt

> **Task**: Build a pure PWA using the UI design from **Project ID: [docs/design-system.md]**.
>
> **Technical Stack**:
> * **Framework**: Vite + React + TypeScript (pure PWA).
> * **UI Library**: Mantine UI (Core, Hooks, and Spotlight for search).
> * **Storage**: IndexedDB (via `idb` wrapper library) for feed subscriptions, cached articles, and bookmarks. Zero server infrastructure.
> * **Feed Fetching**: fetch API with AbortController timeouts (15s). 3-tier proxy fallback chain: direct -> Netlify proxy (`rss-proxy-api.netlify.app`) -> Codetabs proxy.
> * **XML Parsing**: DOMParser for RSS 2.0 and Atom feeds. Extract title, link, description, pubDate, media:content, media:thumbnail, enclosure.
> * **PWA**: Service Worker with Workbox for offline-first caching, Web App Manifest for installability.
> * **Routing**: Client-side hash router or lightweight vanilla router.
> * **Type Safety**: Strictly **no "any"** types. Use explicit interfaces and types for all components, props, and data models.
> * **Licensing**: Use only MIT/Open Source libraries.
>
> **Data Layer (IndexedDB)**:
> * **Database**: `feeds-db`
> * **Object Stores**:
>   - `subscriptions` - Feed records (id autoIncrement, title, url, groupId, groupTitle, sortOrder, suppressHeroImage)
>   - `articles` - Cached feed items (compound key [feedId, link]: id, feedId, title, link, description, pubDate, imageUrls)
>   - `bookmarks` - Saved articles (key: link, title, description, imageUrl, feedTitle, savedAt)
> * **Operations**: Add/edit/delete subscription, fetch/cache articles per feed, toggle bookmark, search articles, filter by feed/group.
>
> **Feature Specifications**:
> * **Theme**: Implement a custom Mantine Theme using the Monolithic Clarity dark palette from the Stitch design. Override all surface tokens, radius values, and typography scales.
> * **Feed Fetching**: Implement 3-tier proxy fallback with typed errors (FeedError: network | parsing | unavailable). Each tier has a 15-second AbortController timeout. On failure, try next tier. On total failure, show user-safe error message with retry action.
> * **XML Parsing**: Use DOMParser to parse RSS/Atom XML. Extract image URLs from `<media:content>`, `<media:thumbnail>`, `<enclosure>`, and `<img>` in description. Strip HTML from descriptions for card previews.
> * **OpenGraph Resolution**: For articles without images, fetch the article URL and extract `og:image` meta tag as fallback hero image.
> * **Screens & Components (Mobile-First)**:
>   1. **AppShell**: Bottom tab navigation (mobile), left sidebar (desktop). Tabs: Home, Search, Bookmarks, Settings.
>   2. **Dashboard**: Bento grid layout - FeaturedArticleCard (hero + overlay), ArticleCard (grid), CompactArticleRow (list). Pull-to-refresh.
>   3. **Feed View**: Articles from selected feed in bento layout. Feed title header. Loading/Error/Data/Empty states (4-branch pattern).
>   4. **Article Reading View**: Full article with hero image, HTML content rendering, bookmark toggle, share action, back navigation.
>   5. **Search**: Sticky search bar with instant filtering by title/description across all cached articles. Category chips.
>   6. **Bookmarks**: Saved articles list with remove action. Persisted in IndexedDB.
>   7. **Settings**: Feed subscription management (list, delete, toggle suppressHeroImage), add feed form (title, URL, group), OPML export/import, clear cache.
>   8. **FeedSidebar (Desktop)**: Grouped feed navigation - standalone feeds as direct rows, grouped feeds (.group) as expandable sections. Selected feed highlighted with accent border.
> * **Interactions**:
>   - Touch-first: tap cards to open article reading view
>   - Pull-to-refresh on feed views
>   - Swipe actions on bookmark/subscription items
>   - Desktop: hover states with Slate Gray background, active nav shows 2px left white accent border
>   - Smooth transitions between screens
> * **PWA Features**:
>   - Offline-first: cached articles readable without network, new fetches require network
>   - Installable on mobile and desktop (manifest.webmanifest)
>   - Service Worker caches static assets + previously fetched article data
>   - Mobile: "Add to Home Screen" optimized (standalone display, status bar theme color)
> * **State Management (4-Branch Pattern)**:
>   - Every async screen: Loading -> Error (+ retry) -> Data (+ filters) -> Empty (+ guidance)
>   - `isLoading` set true at start, false in `finally`
>   - Typed error handling with user-safe messages
>   - Computed derivations for filtered/searched results (never stored)
> * **Layout Strategy**: Mobile-first CSS. Base styles target phone viewport. Use min-width media queries to scale up to tablet/desktop.
> * **Deployment**: Configure `vite.config.ts` with `base: '/feeds-pwa/'` for **GitHub Pages** deployment.
>
> **Code Style**:
> * Functional TypeScript with module pattern. No class-based patterns.
> * Modular file structure: `types/`, `theme/`, `components/`, `screens/`, `db/`, `feed/`.
> * Keep it simple. No unnecessary abstractions.
> * Clean code. No em dashes or emojis in comments.

---

## Developer Onboarding & Deployment Guidelines

### 1. Local Environment Setup

* Node.js v18+ required.
* Clone the repository and navigate to `feeds-pwa/`.
* Run `npm install` to install all pinned dependencies.
* Run `npm run dev` to start the Vite dev server.
* Run `npm run lint` to check for linting errors.
* Run `npm run test` to run the Vitest test suite.

### 2. Project Structure

```
feeds-pwa/
  public/
    manifest.webmanifest   # PWA manifest (standalone, theme_color #131313)
    favicon.svg            # App icon (SVG, used for all PWA icon purposes)
    feeds.json             # Default/seed feed subscriptions (mirrors native DefaultFeeds)
  src/
    types/                 # RssFeedModel, FeedItem, FeedMenuItem, SavedArticle, FeedError
    db/                    # IndexedDB setup + CRUD (subscriptions, articles, bookmarks stores)
    feed/                  # XML fetch (proxy chain), RSS/Atom parser, OpenGraph service
    theme/                 # Mantine theme override (Monolithic Clarity tokens)
    components/            # FeaturedArticleCard, ArticleCard, CompactArticleRow, FeedSidebar, NewArticlesBanner, StateViews
    screens/               # Dashboard, ArticleReading, Search, Bookmarks, Settings
    hooks/                 # useRouter, usePullToRefresh, useAutoRefresh
    sw.ts                  # Service Worker (Workbox precaching + article cache)
    App.tsx                # AppShell with responsive nav (bottom tabs / sidebar)
    main.tsx               # Entry point with MantineProvider + SW registration
    global.css             # Reduced-motion media query + base resets
  index.html
  vite.config.ts           # base: '/feeds-pwa/' for GitHub Pages
  tsconfig.json            # strict: true, no any
  eslint.config.js         # ESLint flat config (typescript-eslint strict)
  .npmrc                   # save-exact=true
```

### 3. IndexedDB Schema

```typescript
// Database: feeds-db

// Store: subscriptions (autoIncrement key: id)
interface FeedSubscription {
  id: number;
  title: string;
  url: string;
  groupId?: string;
  groupTitle?: string;
  sortOrder: number;
  suppressHeroImage: boolean;
}

// Store: articles (compound key: [feedId, link])
interface CachedArticle {
  id: string;
  feedId: number;
  title: string;
  link: string;
  description: string;
  pubDate: string;
  imageUrls: string[];
}

// Store: bookmarks (key: link)
interface SavedArticle {
  link: string;
  title: string;
  description: string;
  imageUrl?: string;
  feedTitle: string;
  savedAt: number;
}
```

### 4. Design Tokens

All Monolithic Clarity color, spacing, and radius values are centralized in `src/theme/index.ts` and exported as the `tokens` constant. Components must import from there. No hardcoded hex values in component files.

| Token | Value | Usage |
|-------|-------|-------|
| Background/Canvas | `#131313` | Main app background |
| Surface/Graphite | `#1C1C1C` | Containers, sidebar, feed lists |
| Elevated/Slate | `#2D2D2D` | Hover states, active elements, inputs |
| Primary Text | `#F5F5F5` | Main content text |
| Secondary Text | `#999999` | Metadata, timestamps, descriptions |
| Accent | `#FFFFFF` | Active indicators, primary buttons |

### 5. Deployment to GitHub Pages

1. Ensure `base: '/feeds-pwa/'` is set in `vite.config.ts`.
2. Run `npm run build` to type-check and generate the `dist` folder.
3. Deploy with `npx gh-pages -d dist`.
4. In GitHub repo Settings > Pages, set source to the `gh-pages` branch.
5. Verify PWA install prompt works on the deployed URL over HTTPS.

### 6. Handling Assets

* **Icons**: Use `@tabler/icons-react` for all UI icons (rss, news, bookmark, search, settings, etc.).
* **PWA Icon**: `public/favicon.svg` is the sole app icon (SVG), referenced by the manifest for both `any` and `maskable` purposes. No PNG icons.
* **Images**: Article hero images loaded at runtime via feed URLs or OpenGraph resolution. No bundled image assets.
* **Fonts**: Inter loaded via Google Fonts in `index.html`.

### 7. Feed Fetching Architecture

```
User selects feed
  -> fetchFeedXml(feed.url)
    -> Tier 1: Direct fetch (15s timeout)
    -> Tier 2: Netlify proxy (15s timeout)
    -> Tier 3: Codetabs proxy (15s timeout)
  -> parseRssXml(xml, feed.id)
    -> DOMParser extracts items
    -> Map to FeedItem[]
  -> Cache articles in IndexedDB
  -> Display in bento grid (4-branch state)
```

### 8. Native App Feature Parity

This PWA mirrors the native [feeds](https://github.com/tshego3/feeds) project. Key mappings:

| Native Feature | PWA Implementation |
|----------------|-------------------|
| SQLiteFeedStore | `src/db/index.ts` (IndexedDB subscriptions store) |
| SQLiteBookmarkStore | `src/db/index.ts` (IndexedDB bookmarks store) |
| FeedService (URLSession) | `src/feed/fetcher.ts` (fetch + proxy chain) |
| RSSXMLParser (SAX) | `src/feed/parser.ts` (DOMParser) |
| OpenGraphService | `src/feed/opengraph.ts` (fetch + regex) |
| FeedViewModel | React state hooks in `src/hooks/` and `src/App.tsx` |
| DashboardView (bento) | `src/screens/Dashboard.tsx` |
| ArticleReadingView | `src/screens/ArticleReading.tsx` |
| FeedSidebar | `src/components/FeedSidebar.tsx` |
| DefaultFeeds (seed data) | `public/feeds.json` |
| Theme.swift (3 themes) | `src/theme/index.ts` (Monolithic Clarity) |
