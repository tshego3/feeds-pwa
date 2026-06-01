# Feeds PWA

Offline-capable RSS feed reader built as a pure Progressive Web App. Web port of the native [feeds](https://github.com/tshego3/feeds) project (Swift/iOS/macOS/Android). Fetches and parses RSS/Atom XML feeds, displays articles in a bento-style card grid, supports categorized feed navigation with a sidebar, bookmarks, article reading view, and full feed subscription management. All data persists locally via IndexedDB with zero server-side infrastructure.

## Tech Stack

- **Framework**: Vite + React + TypeScript (strict mode, no `any`)
- **UI Library**: Mantine 9 (Core, Hooks, Spotlight)
- **Storage**: IndexedDB via `idb` wrapper (subscriptions, cached articles, bookmarks)
- **Feed Parsing**: DOMParser (RSS 2.0, Atom, media:content/thumbnail)
- **Icons**: @tabler/icons-react
- **PWA**: Service Worker (Workbox cache-first), Web App Manifest
- **Design System**: Monolithic Clarity dark theme (matches native app)
- **Testing**: Vitest
- **Linting**: ESLint + typescript-eslint

## Getting Started

Prerequisites: Node.js v18+

```bash
git clone https://github.com/tshego3/feeds-pwa.git
cd feeds-pwa
npm install
npm run dev
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint on src/ |
| `npm run test` | Run Vitest test suite |

## Project Structure

```
feeds-pwa/
  public/
    manifest.webmanifest   # PWA manifest (standalone, theme_color #131313)
    favicon.svg            # App icon (SVG, used for all PWA icon purposes)
    feeds.json             # Default/seed feed subscriptions (mirrors native DefaultFeeds)
  src/
    types/                 # RssFeedModel, FeedItem, FeedMenuItem, SavedArticle, FeedError
    db/                    # IndexedDB setup + CRUD (subscriptions, articles, bookmarks)
    feed/                  # XML fetch (proxy chain), RSS/Atom parser, OpenGraph service
    theme/                 # Mantine theme override (Monolithic Clarity tokens)
    components/            # FeaturedArticleCard, ArticleCard, CompactArticleRow, FeedSidebar, NewArticlesBanner, StateViews
    screens/               # Dashboard, ArticleReading, Search, Bookmarks, Settings
    hooks/                 # useRouter, usePullToRefresh, useAutoRefresh
    sw.ts                  # Service Worker (Workbox precaching + article cache)
    App.tsx                # AppShell with responsive nav (bottom tabs / sidebar)
    main.tsx               # Entry point with MantineProvider + SW registration
    global.css             # Reduced-motion + base resets
  index.html
  vite.config.ts           # base: '/feeds-pwa/' for GitHub Pages
  tsconfig.json            # strict: true
  eslint.config.js         # ESLint flat config
  .npmrc                   # save-exact=true
```

## Architecture

### Feed Fetching (Proxy Fallback Chain)

All RSS/Atom feeds are fetched client-side with a 3-tier proxy fallback (mirrors the native app):

1. **Direct fetch** — attempt the feed URL directly
2. **Netlify proxy** — `https://rss-proxy-api.netlify.app/.netlify/functions/fetch-xml?url=<encoded>`
3. **Codetabs proxy** — `https://api.codetabs.com/v1/proxy/?quest=<encoded>`

Each request has a 15-second `AbortController` timeout. Errors are typed (`network`, `parsing`, `unavailable`) and surfaced as user-safe messages.

### Data Layer (IndexedDB)

Database: `feeds-db` with three object stores:

| Store | Key | Purpose |
|-------|-----|---------|
| `subscriptions` | `id` (autoIncrement) | Feed subscription records (title, url, groupId, sortOrder, suppressHeroImage) |
| `articles` | `[feedId, link]` | Cached feed items per subscription |
| `bookmarks` | `link` | Saved articles for offline reading |

### UI Layout

- **Mobile**: Single-column card list, bottom tab navigation (Home, Search, Bookmarks, Settings)
- **Desktop**: Collapsible left sidebar with grouped feed navigation, central content area (max-width 960px)
- **Dashboard**: Bento grid layout — featured article card + grid cards + compact rows
- **Article Reading**: Full article view with HTML content rendering, share action, bookmark toggle

### State Management (4-Branch Pattern)

Every async data screen follows the Gold Standard pattern:

```
Loading -> Error (+ retry) -> Data (+ filters) -> Empty (+ guidance)
```

## Lighthouse Testing

Run Lighthouse against the **production build**, not the dev server:

```bash
npm run build
npm run preview
# Then run Lighthouse against http://localhost:4173/feeds-pwa/
```

## Deployment (GitHub Pages)

```bash
npm run build
npx gh-pages -d dist
```

In GitHub repo Settings > Pages, set source to the `gh-pages` branch.

## Design Tokens

All Monolithic Clarity color, spacing, and radius values are exported from `src/theme/index.ts`. Components must import from there rather than hardcoding values.

| Token | Value | Usage |
|-------|-------|-------|
| Background/Canvas | `#131313` | Main app background |
| Surface/Graphite | `#1C1C1C` | Containers, sidebar, feed lists |
| Elevated/Slate | `#2D2D2D` | Hover states, active elements |
| Primary Text | `#F5F5F5` | Main content text |
| Secondary Text | `#999999` | Metadata, timestamps |
| Accent | `#FFFFFF` | Active indicators, primary buttons |

## Data Models

```typescript
interface RssFeedModel {
  id: number;
  title: string;
  url: string;
  suppressHeroImage: boolean;
  sortOrder: number;
}

interface FeedItem {
  id: string;
  feedId: number;
  title: string;
  link: string;
  description: string;
  pubDate: string;
  imageUrls: string[];
}

interface SavedArticle {
  link: string;
  title: string;
  description: string;
  imageUrl?: string;
  feedTitle: string;
  savedAt: number;
}
```

## Native App Reference

This PWA mirrors the feature set of the native [feeds](https://github.com/tshego3/feeds) project:

| Native (Swift) | PWA (TypeScript) |
|----------------|------------------|
| SQLite (SkipSQLPlus) | IndexedDB via `idb` (`src/db/index.ts`) |
| XMLParser (SAX) | DOMParser (`src/feed/parser.ts`) |
| URLSession + proxy chain | fetch + AbortController + proxy chain (`src/feed/fetcher.ts`) |
| SwiftUI Views | Mantine 9 components |
| ObservableObject ViewModels | React hooks (`src/hooks/`) |
| SQLCipher bookmarks | IndexedDB bookmarks store |
| AsyncImage + ImageResolver | `<img>` + OpenGraph service (`src/feed/opengraph.ts`) |
| DashboardView (bento) | `src/screens/Dashboard.tsx` |
| ArticleReadingView | `src/screens/ArticleReading.tsx` |
| FeedSidebar | `src/components/FeedSidebar.tsx` |
| DefaultFeeds (seed data) | `public/feeds.json` |
| MLX on-device AI summaries | Not available (see below) |

### Native AI Functionality

The native app uses Apple's MLX framework for on-device article summaries, which requires Metal GPU access on Apple Silicon. This feature **cannot** be replicated in the PWA — browsers do not expose the low-level GPU compute needed for local LLM inference. Potential future alternatives:

- **WebLLM / WebGPU** — experimental, limited browser support, slow on most devices
- **Cloud summarization API** — requires a backend service
- **Omit** — the native app guards AI behind `#if canImport(MLXLLM)`, so the PWA simply does not offer this feature

## License

MIT
