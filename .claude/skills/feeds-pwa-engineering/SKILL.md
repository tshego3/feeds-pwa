---
name: feeds-pwa-engineering
description: Core engineering rules for feeds-pwa (TypeScript + Vite + Mantine PWA). Use before ANY feature work, bug fix, or refactor in this repository - covers architecture boundaries, project structure, TypeScript strictness, change management, build/tooling, and deployment rules.
---

# Engineering Rules (TypeScript + Vite + Mantine PWA)

These rules are mandatory for all feature work, bug fixes, and refactors.

## Platform Identity

1. Stack is TypeScript + React + Vite (pure client-side PWA - no SSR, no framework router, no server runtime).
2. UI library is [Mantine](https://mantine.dev/) (Core, Hooks, Spotlight).
3. This is **feeds-pwa** - the web PWA spin-off of the native Swift [feeds](/Users/netuser/Projects/feeds) project (iOS/macOS/Android RSS reader). Core features mirror the native app; do not deviate from native behavior without justification.
4. Feed data is fetched over the network via a proxy fallback chain. Subscriptions, cached articles, and bookmarks persist locally via IndexedDB (`idb` wrapper).
5. PWA features via Workbox Service Worker. Deployment target is GitHub Pages.

## Non-Negotiable Architecture Rules

1. No app server - no Express, no Node server, no SSR runtime. The PWA itself is static (GitHub Pages). The only backend is two small self-hosted Cloudflare Workers: `proxy/` (CORS proxy for feed fetching) and `push-worker/` (Web Push subscriptions + cron sender) - do not add server logic beyond those two, and keep them dependency-free single files.
2. No remote database for app data. IndexedDB is the sole data layer for subscriptions/articles/bookmarks; the push worker's KV namespace stores only push subscriptions and per-feed lastSeen dedup state, never article content.
3. No authentication flows requiring a backend.
4. Keep modules small and focused - one concern per file.
5. Shared types and interfaces live in `src/types/`. Never create model types outside it; no inline duplication.
6. Routing is client-side hash router or lightweight vanilla router. No framework router libraries.

## Architecture Layers

```
Components (React/Mantine) --reads--> Hooks/State --calls--> Services (src/feed/, src/db/) --uses--> Types (src/types/)
```

| Layer | Responsibility | Location |
|-------|---------------|----------|
| Types | Pure interfaces, zero runtime deps | `src/types/` |
| Services (DB) | IndexedDB CRUD via `idb`. Pure I/O | `src/db/` |
| Services (Feed) | RSS fetch with proxy fallback, XML parsing, OpenGraph | `src/feed/` |
| Theme | Centralized Mantine theme override (Monolithic Clarity) | `src/theme/` |
| Components | Presentational, receive data via props, no direct service calls | `src/components/` |
| Screens | Page-level composition, orchestrate services via hooks | `src/screens/` |
| Service Worker | Workbox precaching + runtime article caching | `src/sw.ts` |

**Golden rule:** Components never call services directly. Screens orchestrate data flow via hooks or service functions.

## Project Structure

1. Entry point is `index.html` at root; app entry is `src/main.tsx` with MantineProvider and SW registration.
2. Vite config at root with `base: '/feeds-pwa/'` for GitHub Pages.
3. Static assets in `public/` (manifest.webmanifest, favicon.svg, feeds.json seed subscriptions). No `src/assets/` for runtime data - use IndexedDB.
4. `src/theme/` is the single source of design tokens.

## TypeScript Rules

1. `strict: true` - no exceptions. Treat all compiler and linter warnings as errors.
2. Strictly **no `any` types**. Explicit interfaces and types for all components, props, and data models.
3. Never use `@ts-ignore` or `@ts-expect-error` without a comment explaining why.
4. `interface` for object shapes; `type` for unions, intersections, computed types.
5. Prefer `const` over `let`; never `var`. Template literals over concatenation. `readonly` where mutation is not required.
6. Functional TypeScript with module pattern. No class-based patterns unless justified.
7. No non-null assertions (`!`) in production code - use optional chaining, nullish coalescing, or explicit checks.

## Robust Coding Principles

1. Simple control flow - avoid complex recursion; all loops must have a deterministic upper bound.
2. Functions <=40 lines; extract sub-functions if longer.
3. Guard clauses: validate inputs at the top, exit early on invalid state.
4. Module-private (unexported) functions by default; expose only the public API.
5. Never ignore a Promise - always `await` or explicitly `.catch()`.
6. Immutability first: `readonly` properties, new objects over mutation.
7. No global mutable state - no module-level `let` for shared state; use React state, context, or service modules.

## Production Stability

1. Context-rich errors - never `throw new Error('failed')`. Use typed error objects: `throw { type: 'network', message: 'Feed unavailable', status: 404 }`.
2. No empty catch blocks - at minimum, log why it is safe to ignore.
3. Timeouts on all network calls via `AbortController` - never let a request hang.
4. Keep business logic in pure functions separate from I/O.
5. User-safe error messages - never expose raw errors, stack traces, or file paths.

## Change Management

1. Prefer minimal, scoped changes over broad rewrites. Do not refactor unrelated areas.
2. Keep naming, formatting, and style aligned with surrounding code.
3. Code must pass ESLint with zero errors before merge.
4. No nested ternaries or deeply nested conditionals - prefer early returns and flat logic. Avoid unnecessary conditionals - prefer ternary, nullish coalescing (`??`), optional chaining (`?.`).
5. Direct, descriptive naming. Apply DRY - reuse existing utilities before creating parallel implementations.
6. If code cannot be understood quickly without comments, simplify it first.
7. Clean code. No em dashes or emojis in comments.
8. Replace any hardcoded mock/placeholder data before completion - use service calls, state defaults, or clearly marked `// TODO:` stubs returning empty arrays.
9. **Code is liability, not an asset.** Every line must justify its existence. Pursue the smallest diff; prefer deleting or simplifying over adding.
10. Compliance pass before finalizing: verify alignment with these project skills and `docs/design-system.md`, and audit dependencies/security - (a) packages from legitimate publishers, (b) no unmaintained deps (last commit > 12 months), (c) no known CVEs, (d) no hardcoded secrets, (e) all network calls use HTTPS + timeouts + input validation, (f) error messages leak no internals.

## Build and Tooling

1. Use `npm` only; commit `package-lock.json`.
2. All dependency versions pinned exactly (no `^`/`~`) - `.npmrc` has `save-exact=true`.
3. Justify every new dependency; prefer lightweight, single-purpose, MIT/Apache-licensed packages. Vet before adoption: verify on npmjs.com, legitimate publisher, no CVEs, active maintenance. Do not trust AI-suggested package names blindly.
4. Core deps: `@mantine/core`, `@mantine/hooks`, `@mantine/spotlight`, `idb`, `workbox-precaching`, `@tabler/icons-react`.
5. Run `npm run build` after changes to verify zero TypeScript errors; `vite preview` to verify production build.

## Deployment (GitHub Pages)

1. `base: '/feeds-pwa/'` in `vite.config.ts`; build to `dist/`; deploy with `npx gh-pages -d dist` (source: `gh-pages` branch).
2. Verify PWA install prompt on the deployed HTTPS URL. No source maps in production unless explicitly required.

## Adding a New Feature (Checklist)

1. **Types** - interfaces in `src/types/` with `readonly` properties
2. **Services** - async functions in `src/feed/` or `src/db/` - pure I/O with typed errors
3. **State** - hook or state module with loading/error/data flow
4. **Components** - Mantine-based, props-driven, 4-branch rendering
5. **Screens** - compose components, wire services at screen level
6. **Tests** - Vitest cases for parsing, db operations, service behavior
7. **Build** - `npm run build` with zero errors
