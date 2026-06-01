# Engineering Rules (TypeScript + Vite + Mantine PWA)

These rules are mandatory for all feature work, bug fixes, and refactors in this repository.

## 1) Platform Identity

1. Stack is TypeScript + React + Vite (pure client-side PWA — no SSR, no framework router, no server runtime).
2. UI library is [Mantine](https://mantine.dev/) (Core, Hooks, and Spotlight) which requires React.
3. This is **feeds-pwa** — the web PWA spin-off of the native Swift [feeds](/Users/netuser/Projects/feeds) project (iOS/macOS/Android RSS reader).
4. Core features mirror the native app: RSS/XML feed fetching (with proxy fallback), article parsing, bento-style card grid display, categorized/grouped feed navigation with sidebar, feed subscription management (add/delete/configure), bookmarks, and article reading view.
5. Feed data is fetched over the network via proxy chain (direct -> Netlify proxy -> Codetabs proxy). Subscriptions, cached articles, and bookmarks persist locally via IndexedDB (using the `idb` wrapper library).
6. PWA features via Workbox Service Worker for offline caching of static assets and previously fetched articles. Web App Manifest for installability.
7. Deployment target is GitHub Pages.

## 2) Non-Negotiable Architecture Rules

1. No server-side code — no Express, no Node server, no SSR runtime. The only network calls are to RSS feed URLs via CORS proxies.
2. No remote database connections or ORM usage. IndexedDB is the sole local data layer.
3. No authentication flows requiring a backend (no JWT issuance, no session cookies, no OAuth server callbacks).
4. Feed subscriptions and cached articles live in IndexedDB (`feeds-db`). Static content lives in source or `public/`.
5. Keep modules small and focused — one concern per file.
6. Shared types and interfaces live in `src/types/`. Do not duplicate type definitions across modules.
7. Routing is client-side hash router or lightweight vanilla router. No framework router libraries.
8. Proxy fallback chain for XML fetching (matches native app): direct fetch -> Netlify proxy (`rss-proxy-api.netlify.app`) -> Codetabs proxy. Handle each failure gracefully.

## 3) Project Structure Rules

1. Entry point is `index.html` at the project root, with scripts in `src/`.
2. Keep a flat, predictable structure:
   ```
   feeds-pwa/
     public/
       manifest.webmanifest   -- PWA manifest (name, SVG icon, theme_color, display: standalone)
       favicon.svg            -- App icon (SVG, used for all PWA icon purposes)
       feeds.json             -- Default/seed feed subscriptions (mirrors native DefaultFeeds)
     src/
       types/                 -- RssFeedModel, FeedItem, FeedCategory, FeedMenuItem, SavedArticle
       db/                    -- IndexedDB setup and CRUD operations (idb wrapper)
       feed/                  -- XML fetch, parse, proxy fallback, OpenGraph image resolution
       theme/                 -- Mantine theme override (matches native Theme.swift)
       components/            -- FeaturedArticleCard, ArticleCard, CompactArticleRow, FeedSidebar
       screens/               -- Dashboard, FeedView, Search, Bookmarks, Settings, ManageFeeds
       sw.ts                  -- Service Worker (Workbox precaching + article cache)
       main.ts                -- App entry with MantineProvider and router
   ```
3. Vite config lives at the project root (`vite.config.ts`) with `base: '/feeds-pwa/'` for GitHub Pages.
4. Static assets (icons, fonts) belong in `public/`. No `src/assets/` for runtime data — use IndexedDB.
5. `src/theme/` is the centralized design token source — all Monolithic Clarity palette values originate here.

## 4) TypeScript Rules

1. Enable `strict: true` in `tsconfig.json` — no exceptions.
2. Strictly **no `any` types**. Use explicit interfaces and types for all components, props, and data models.
3. Never use `@ts-ignore` or `@ts-expect-error` without a comment explaining why it is necessary.
4. Use `interface` for object shapes and `type` for unions, intersections, and computed types.
5. Export types from `src/types/` and import them where needed — no inline duplication.
6. Prefer `const` over `let`; never use `var`.
7. Use template literals over string concatenation.
8. Prefer `readonly` properties where mutation is not required.
9. Use functional TypeScript with module pattern. No class-based patterns unless justified.

## 5) Design System and Styling Rules

### Monolithic Clarity Dark Theme

1. **All design tokens live in `src/theme/`** — the Mantine theme override consuming the Monolithic Clarity dark palette from `docs/design-system.md`. This is the single source of visual truth.
2. The theme is consumed by `MantineProvider` at app initialization. All palette, font, radius, and spacing values derive from the theme config.
3. **No hardcoded colors, font families, or spacing values in components** — components must use Mantine theme tokens or CSS variables (`var(--mantine-color-*)`) exclusively.
4. If a component needs a design token in TypeScript, import from `src/theme/` — never inline the value.

### Color Palette (Monolithic Clarity)

5. **Background/Canvas: Charcoal (`#131313`)** — main app background, minimizes eye strain.
6. **Surface: Graphite (`#1C1C1C`)** — primary UI containers, sidebars, feed lists.
7. **Elevated: Slate Gray (`#2D2D2D`)** — hover states, active elements, input backgrounds.
8. **Primary Text: Off-White (`#F5F5F5`)** — prevents halogen vibration on dark backgrounds.
9. **Secondary Text: Muted (`#999999`)** — metadata and less critical information.
10. **Accent: White (`#FFFFFF`)** — active states, indicators, and primary buttons.
11. Depth is conveyed through **tonal layering only** — no shadows. Use background lightness tiers for elevation.
12. Glassmorphism for overlays: 80% opacity + 20px backdrop blur with 1px Slate Gray border.

### Typography

13. **Inter** is the sole font family — used for all headings, body, and labels. No secondary fonts.
14. Headlines use tight letter-spacing (`-0.02em`) and semi-bold weight for visual anchoring.
15. Body text uses generous 1.6 line-height for readability.
16. Labels use increased tracking for metadata differentiation.
17. Load Inter via Google Fonts or self-host in `public/fonts/`.

### Shape and Spacing

18. Rounded corners: 8px standard, 16px cards, 24px outer wrappers.
19. Spacing based on 4px baseline grid. Container padding: 24px desktop, 16px mobile.
20. Soft 1px dividers using Slate Gray — no heavy borders.

### Asset Rules

21. All images and visual assets must be real — supplied by the business or from approved stock. Never use AI-generated images.
22. If an asset is missing, use a themed placeholder container with a `<!-- TODO: replace with real asset -->` comment.
23. Use `@tabler/icons-react` for all UI icons (rss, news, search, settings, bookmark, etc.).

### Styling Rules

24. Use Mantine's built-in styling approaches: component props (`color`, `variant`, `size`) and the `style` prop referencing theme tokens.
25. Keep responsive design mobile-first. Base styles target phone viewport. Use min-width media queries to scale up to tablet/desktop.
26. **No `.module.css` files.** Centralize style objects if needed and import them. No inline style definitions in component files.
27. **No hardcoded color values in components.** All colors must reference theme tokens.
28. No `!important` unless overriding third-party library styles with no alternative.
29. Maintain visual hierarchy with Mantine's spacing scale and type scale derived from the theme.

## 6) Data Layer Rules (IndexedDB)

1. Database name: `feeds-db`.
2. Use the `idb` wrapper library for all IndexedDB operations — no raw IndexedDB API calls.
3. Object stores: `subscriptions` (feed subscription records), `articles` (cached feed items for offline reading), `bookmarks` (saved articles).
4. Schema (mirrors native Swift models):
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

   // Hierarchical menu structure for sidebar navigation
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
     readonly imageUrls: string[];  // From enclosure/media:content/content:encoded/og:image
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
5. Operations: Add/remove feed subscription, fetch and cache articles, get articles by feed, search articles, save/unsave bookmarks, clear cache, toggle `suppressHeroImage` per feed.
6. All CRUD logic lives in `src/db/` — no database operations in component or screen files.
7. Export/import subscriptions as JSON for backup (Settings screen).

## 7) Feed Fetching and Parsing Rules

1. RSS/XML fetching uses a proxy fallback chain (mirrors native `FeedService.swift`):
   - **Primary**: Direct fetch (many feeds support CORS)
   - **Secondary**: Netlify proxy (`https://rss-proxy-api.netlify.app/.netlify/functions/fetch-xml?url=`)
   - **Tertiary**: Codetabs proxy (`https://api.codetabs.com/v1/proxy/?quest=`)
2. Always URL-encode the feed URL when passing to proxies. Use a 15-second timeout per request.
3. Parse XML responses using `DOMParser` — no external XML parsing libraries needed.
4. Extract `FeedItem` fields (mirrors native `RSSXMLParser.swift`): title, link, description (strip HTML tags for preview), pubDate, image URLs (from `<enclosure>`, `<media:content>`, `<media:thumbnail>`, `<content:encoded>` img tags, or `<image>` elements).
5. Handle partial failures gracefully — display available articles even if some feeds fail. Use typed error messages (network error, parsing error, feed unavailable with status).
6. Feed subscription list is loaded from IndexedDB. Default/seed feeds bundled in `public/feeds.json` (mirrors native `DefaultFeeds.swift`).
7. All fetch logic lives in `src/feed/` — components never call `fetch()` directly for RSS data.
8. OpenGraph image resolution: if a feed item has no image, attempt to fetch `og:image` from the article's HTML (mirrors native `OpenGraphService.swift`). Cache resolved OG images in memory per session.
9. Image resolution priority (mirrors native `ImageResolver`): (1) feed item `imageUrls[0]`, (2) OpenGraph `og:image` from article HTML. Respect `suppressHeroImage` flag per feed.

## 8) Security Rules (Client-Side)

1. Never store secrets, API keys, or credentials in source code or localStorage.
2. If consuming a third-party public API, use environment variables via Vite's `import.meta.env` (prefixed `VITE_`) — never commit `.env` files with real keys.
3. Sanitize any user-generated content and RSS content before rendering to prevent XSS. Use `textContent` over `innerHTML` unless deliberately rendering trusted markup.
4. Do not use `eval()`, `Function()`, or `document.write()`.
5. Set `rel="noopener noreferrer"` on all external links opened with `target="_blank"`.
6. Strip or sanitize HTML from RSS `<description>` and `<content:encoded>` before rendering.
7. If using forms, validate inputs client-side for UX — but never trust client-side validation as a security boundary.
8. **Vet all dependencies before adoption.** Before adding any npm package: (a) verify it exists on npmjs.com, (b) confirm the publisher/organization is legitimate, (c) check for known CVEs or security advisories, (d) review the package's GitHub stars, maintenance activity, and last commit date, (e) prefer dependencies with a clear license (MIT, Apache 2.0). Do not blindly trust AI-suggested package names — they may not exist or may be typosquatted.
9. Validate all external input (URL strings, JSON payloads, RSS content) before use.

## 9) UI and Interaction Rules

Refer to `docs/design-system.md` for the full Monolithic Clarity design specification including color tokens, typography scale, spacing system, and component specifications.

1. Follow a calm, productivity-focused aesthetic: generous whitespace, clear hierarchy, intentional tonal layering — all derived from the Mantine theme.
2. Use Mantine's `Paper` and `Card` components with `radius` props for tonal layering. No shadows; depth through background color tiers only.
3. Keep typography consistent — use Mantine's `Title`, `Text` components. Font families and scale come exclusively from the Mantine theme.
4. All interactive elements must have visible focus states — Mantine handles this by default; do not disable `focusRing` in the theme.
5. Touch-optimized tap targets (min 44px hit area). Touch-first interactions: swipe, tap, long-press.
6. Maintain a minimum 4.5:1 contrast ratio for text (WCAG AA).
7. Responsive design is mandatory — mobile-first CSS, test at mobile (360px), tablet (768px), and desktop (1280px+).
8. Animations must respect `prefers-reduced-motion`.
9. **Consult Mantine component API first** — before building custom UI, check https://mantine.dev/core/ for an existing component.

### Screen Specifications

10. **AppShell**: Bottom tab navigation (mobile), left sidebar with grouped feed navigation (desktop). Tabs: Home, Bookmarks, Search, Settings.
11. **Dashboard (Home)**: Bento-style layout mirroring native `DashboardView` — featured article card (hero + overlay) at top, grid of article cards, compact article rows below. Shows articles from the currently selected feed.
12. **Feed Sidebar/Navigation**: Hierarchical feed list matching native `FeedSidebar` — standalone feeds as direct rows, grouped feeds (Sports, News, Tech, etc.) as expandable sections with sub-items. Selected feed shows indicator.
13. **Article Cards** (three variants matching native app):
    - `FeaturedArticleCard`: Large hero image with title overlay (first/featured article)
    - `ArticleCard`: Grid card with image, title, truncated description, date
    - `CompactArticleRow`: List-style row with small thumbnail, title, date
    - All respect `suppressHeroImage` flag per feed.
14. **Article Reading View**: In-app article reader rendering HTML content (mirrors native `ArticleReadingView`). Theme-aware CSS injection for dark mode. Bookmark toggle.
15. **Bookmarks**: Saved articles list (mirrors native `SavedArticlesView`). Persisted in IndexedDB.
16. **Add/Manage Feeds**: Bottom sheet (mobile) or modal (desktop) with fields: feed title, feed URL, group (optional), suppress hero image toggle. Manage feeds screen with swipe-to-delete and hero image suppression toggles (mirrors native `ManageFeedsView`).
17. **Search**: Sticky top search bar with instant filtering across article titles and descriptions. Category chips for feed filtering (horizontally scrollable).
18. **Settings**: Appearance mode cycle (Auto/Light/Dark/Monochrome), subscription export/import (JSON/OPML), clear article cache, manage feeds, about section.

### Interaction Patterns

19. Pull-to-refresh gesture fetches latest articles for active feed (silent refresh, no loading spinner — mirrors native `refreshFeed()`).
20. Auto-refresh: optionally refresh the current feed every 15 minutes in background. Show "New Articles" banner when new content detected (auto-dismiss after 5 seconds, mirrors native `NewArticlesBanner`).
21. Cards use subtle scale transform on press.
22. Smooth page transitions between screens.
23. Desktop: hover states use Slate Gray background transition, active nav shows 2px left white accent border.
24. Loading skeletons while feeds are being fetched.
25. Bookmark toggle on article cards and reading view.

## 10) PWA Rules

1. App must cache previously fetched articles for offline reading — articles viewed online remain accessible offline.
2. Service Worker uses Workbox for precaching all static assets and runtime caching of fetched article data (`src/sw.ts`).
3. Web App Manifest (`public/manifest.webmanifest`) with: app name "feeds", SVG icon (any + maskable), `display: standalone`, `theme_color` matching Charcoal (#131313).
4. Mobile "Add to Home Screen" optimized — standalone display, status bar theme color.
5. Installable on both mobile and desktop.
6. Offline indicator — show a subtle banner when the device is offline, indicating cached content is being displayed.

## 11) Performance Rules

1. Use Vite's built-in code splitting — dynamic `import()` for screens or heavy modules.
2. Optimize images at build time (use appropriate formats: WebP/AVIF for photos, SVG for icons).
3. Lazy-load article hero images below the fold.
4. Keep the initial bundle small — audit with `vite build --report` or `npx vite-bundle-visualizer`.
5. Avoid render-blocking resources; defer non-critical scripts and styles.
6. Do not import entire libraries when only a single utility is needed (tree-shake or import specific paths).
7. Service Worker must cache all static assets for instant load on repeat visits.
8. Paginate or virtualize long article lists to avoid rendering hundreds of DOM nodes.

## 12) Testing Rules

1. Use Vitest for unit tests (aligned with Vite).
2. Test pure utility functions, XML parsing logic, IndexedDB operations, and proxy fallback behavior.
3. Keep tests co-located with source files (`feed/parser.ts` -> `feed/parser.test.ts`) or in a parallel `__tests__/` folder.
4. Run `npm run build` to verify zero TypeScript errors and successful production build.
5. Validate accessibility with automated checks (axe-core or similar) on key screens.

## 13) Change Management Rules

1. Prefer minimal, scoped changes over broad rewrites.
2. Do not refactor unrelated areas while implementing targeted fixes.
3. Keep naming, formatting, and coding style aligned with surrounding code.
4. Use ESLint and Prettier (or Biome) — code must pass lint with zero errors before merge.
5. No nested ternaries or deeply nested conditionals — prefer early returns and flat logic.
6. Keep functions short and focused (<=40 lines preferred). If longer, break it up.
7. Use direct, descriptive naming for variables, functions, and files.
8. Apply DRY — reuse existing utilities before creating parallel implementations.
9. If code cannot be understood quickly without comments, simplify it first.
10. Clean code. No em dashes or emojis in comments.
11. AI agent compliance check: before finalizing changes, verify alignment with this document and `docs/design-system.md`. **When a compliance check is run, also audit dependencies and security**: (a) verify all packages in `package.json` are from known, legitimate publishers, (b) check for outdated or unmaintained dependencies (last commit > 12 months), (c) scan for known vulnerabilities (CVEs, security advisories) against current dependency versions, (d) confirm no secrets, API keys, or credentials are hardcoded in source or config files, (e) validate that all network calls use HTTPS, timeouts, and input validation, (f) ensure error messages do not leak internal details (stack traces, raw error descriptions, file paths).
12. **If hardcoded mock/placeholder data is found in components, treat it as temporary scaffolding and replace it before completion** — use service calls, state defaults, or clearly marked `// TODO:` stubs that return empty arrays.
13. **Avoid unnecessary conditionals** — prefer ternary expressions, early returns, nullish coalescing (`??`), and optional chaining (`?.`) over redundant `if` blocks.
14. **Code is liability, not an asset.** Every line added must justify its existence. Prefer deleting code over adding it, and always pursue the smallest diff that solves the problem. If a feature can be achieved by removing or simplifying existing code instead of writing new code, do that.

## 14) Build and Tooling Rules

1. Use `npm` — do not mix package managers.
2. Lock files (`package-lock.json`) must be committed.
3. All dependencies must be explicitly listed in `package.json` — no relying on transitive installs.
4. Dev dependencies vs. production dependencies must be correctly categorized.
5. Keep Vite and TypeScript versions up to date; pin major versions to avoid surprise breakage.
6. Use `vite preview` to verify the production build locally before deploying.
7. **All dependency versions must be pinned exactly** (no `^` or `~` prefixes). Use `.npmrc` with `save-exact=true` to enforce this.
8. Do not add bloated or unnecessary packages. Prefer lightweight, single-purpose dependencies. Justify every new dependency.
9. Use only MIT/Open Source licensed libraries.
10. Core dependencies: `@mantine/core`, `@mantine/hooks`, `@mantine/spotlight`, `idb`, `workbox-precaching`, `@tabler/icons-react`.

## 15) Accessibility Rules

1. Use semantic HTML elements (`<nav>`, `<main>`, `<section>`, `<button>`, `<article>`, etc.) — do not use `<div>` for interactive elements.
2. All form inputs must have associated `<label>` elements.
3. Ensure keyboard navigation works for all interactive elements.
4. Use ARIA attributes only when semantic HTML is insufficient — do not over-ARIA.
5. Page must have a single `<h1>` and headings must follow logical order.
6. Skip-to-content link should be present for keyboard users.
7. Touch targets minimum 44px for mobile accessibility.
8. Article cards must be accessible — proper heading hierarchy, alt text for images, link purpose clear.

## 16) Deployment Rules (GitHub Pages)

1. Set `base: '/feeds-pwa/'` in `vite.config.ts`.
2. Build output is a static folder (`dist/`) deployed to GitHub Pages.
3. Deploy with `npx gh-pages -d dist`.
4. In GitHub repo Settings > Pages, set source to the `gh-pages` branch.
5. Ensure `public/` assets (manifest.webmanifest, icons, robots.txt) are correctly copied to build output.
6. Verify PWA install prompt works on the deployed URL over HTTPS.
7. Never include source maps in production deployments unless explicitly required for debugging.
8. Configure proper cache headers for hashed assets (Vite handles filename hashing by default).

## 17) Architecture Layers and Responsibilities

```
Components (React/Mantine) ──reads──► Hooks/State ──calls──► Services (src/feed/, src/db/) ──uses──► Types (src/types/)
```

| Layer | Responsibility | Location |
|-------|---|---|
| **Types** | Pure interfaces and type definitions. Zero runtime dependencies. | `src/types/` |
| **Services (DB)** | IndexedDB CRUD operations via `idb` wrapper. Pure I/O layer. | `src/db/` |
| **Services (Feed)** | RSS fetch with proxy fallback, XML parsing, OpenGraph resolution. Pure I/O layer. | `src/feed/` |
| **Theme** | Centralized Mantine theme override (Monolithic Clarity palette). Single source of visual truth. | `src/theme/` |
| **Components** | Reusable presentational UI components. Receive data via props. No direct service calls. | `src/components/` |
| **Screens** | Page-level compositions that orchestrate components and call services via hooks. | `src/screens/` |
| **Service Worker** | Workbox precaching and runtime article caching. | `src/sw.ts` |

**Golden rule:** Components never call services directly. Screens orchestrate data flow via hooks or service functions.

**Type rule:** Never create model types outside `src/types/`. All shared interfaces must be defined there and imported where needed.

## 18) Adding a New Feature (Checklist)

1. **Types** — Define interfaces in `src/types/` with `readonly` properties and explicit types
2. **Services** — Add async service functions in `src/feed/` or `src/db/` — pure I/O with typed errors
3. **State** — Add state management (React hook or state module) with loading/error/data flow
4. **Components** — Create Mantine-based components that read state via props with 4-branch rendering
5. **Screens** — Compose components and wire to services at the screen level
6. **Tests** — Add Vitest cases for parsing logic, db operations, and service behavior
7. **Build** — Run `npm run build` to verify zero errors

## 19) Robust Coding Principles

1. **Simple Control Flow**: Avoid complex recursion. Use iteration for predictable stack depth.
2. **Bounded Loops**: All loops/iterations must have a deterministic upper bound. Avoid unbounded loops.
3. **Small Functions**: No function should exceed 40 lines. If longer, extract sub-functions.
4. **Guard Clauses**: Validate inputs and preconditions at the top of functions. Exit early on invalid state.
5. **Data Hiding**: Use module-private functions (unexported). Expose only what's needed in the public API.
6. **Check Return Values**: Never ignore a Promise without handling it. Always `await` async calls or explicitly handle with `.catch()`.
7. **No Force Assertions**: Never use non-null assertions (`!`) in production code. Use optional chaining, nullish coalescing, or explicit checks.
8. **Compile-Time Safety**: TypeScript `strict: true` is non-negotiable. Treat all compiler warnings as errors.
9. **Immutability First**: Prefer `readonly` properties and `const` declarations. Use new objects rather than mutation where practical.

## 20) Production Stability Rules

1. **Context-Rich Errors**: Never throw generic `Error('something failed')`. Use typed error objects or discriminated unions describing the failure context.
   - *Bad:* `throw new Error('failed')`
   - *Good:* `throw { type: 'network', message: 'Feed unavailable', status: 404 }`
2. **Fail Fast**: Validate preconditions at function entry. Return early on invalid state.
3. **No Empty Catch Blocks**: Never use `catch { }` or `catch (_) { }` without handling the error. At minimum, log why it's safe to ignore.
4. **Timeouts on Network Calls**: Always set `AbortController` with timeout on `fetch()` — never let a request hang indefinitely.
5. **Pure Logic Separation**: Keep business logic in pure functions (input in, output out) separate from I/O. Pure functions are trivial to unit test.
6. **No Global Mutable State**: Do not use module-level `let` variables for shared state. Use React state, context, or service modules.
7. **User-Safe Error Messages**: Always provide users with a descriptive, actionable failure reason. Never expose raw error messages, stack traces, or file paths.

## 21) Gold Standard State Management

**Mandatory pattern** for all screens/components that fetch and display async data. Mirrors the native SwiftUI 4-branch pattern.

### State Structure (Required Elements)

Every async data-loading screen must manage:

1. **Data state** — `items: FeedItem[]` (raw data from service, initialized to `[]`)
2. **Loading state** — `isLoading: boolean` (true during fetch)
3. **Error state** — `errorMessage: string | null` (user-safe error, null on success)
4. **Derived/computed** — `filteredItems`, `hasItems`, etc. (never stored, always computed)

### 4-Branch Rendering Pattern (Exact Order)

```typescript
if (isLoading) {
  // BRANCH 1: Loading — show skeleton/spinner
} else if (errorMessage) {
  // BRANCH 2: Error — show message + retry button
} else if (items.length > 0) {
  // BRANCH 3: Data — show content + filters
} else {
  // BRANCH 4: Empty — show guidance message
}
```

### Error Handling (Three Levels)

1. **Network errors** (fetch failures, timeouts): "Network error. Please check your connection."
2. **Parsing errors** (invalid XML, unexpected format): "Unable to read feed data."
3. **Unexpected errors** (catch-all): "Something went wrong. Please try again."

### Non-Negotiable Rules

1. **Always set `isLoading = false`** after async work completes (use `finally` block).
2. **Never display raw data** — use filtered/computed derivations for rendering.
3. **Always provide user-safe error messages** — never expose raw error strings.
4. **Always initialize collections to `[]`** — never leave them as `undefined`.
5. **Always provide a "Try Again" action** in the error state.
6. **Never skip loading check** — always render all 4 branches.
7. **Keep filter/search logic outside components** — compute in service/hook layer.