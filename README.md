# Feeds PWA

Offline-capable RSS feed reader built as a pure Progressive Web App. Web port of the native [feeds](https://github.com/tshego3/feeds) project (Swift/iOS/macOS/Android). Fetches and parses RSS/Atom XML feeds, displays articles in a bento-style card grid, supports categorized feed navigation with a sidebar, bookmarks, article reading view, and full feed subscription management. All data persists locally via IndexedDB with zero server-side infrastructure.

## Tech Stack

- **Framework**: Vite + React + TypeScript (strict mode, no `any`)
- **UI Library**: Mantine 9 (Core, Hooks, Spotlight)
- **Storage**: IndexedDB via `idb` wrapper (subscriptions, cached articles, bookmarks)
- **Feed Parsing**: DOMParser (RSS 2.0, Atom, media:content/thumbnail)
- **Icons**: @tabler/icons-react
- **PWA**: Service Worker (Workbox cache-first), Web App Manifest, Web Push notifications
- **Backend (minimal)**: two self-hosted Cloudflare Workers — CORS proxy (`proxy/`) and push sender (`push-worker/`, KV + cron)
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
    hooks/                 # useRouter, usePullToRefresh, useAutoRefresh, useScrollRestoration
    notifications/         # In-app notifications + Web Push subscription client
    preferences.ts         # localStorage-backed user preferences
    sw.ts                  # Service Worker (Workbox precaching + article cache + push handler)
    App.tsx                # AppShell with responsive nav (bottom tabs / sidebar)
    main.tsx               # Entry point with MantineProvider + SW registration
    global.css             # Reduced-motion + base resets
  proxy/                   # Cloudflare Worker: CORS proxy for feed fetching
  push-worker/             # Cloudflare Worker: Web Push subscriptions + cron sender
  index.html
  vite.config.ts           # base: '/feeds-pwa/' for GitHub Pages
  tsconfig.json            # strict: true
  eslint.config.js         # ESLint flat config
  .npmrc                   # save-exact=true
```

## Architecture

### Feed Fetching (Cloudflare Proxy First)

All RSS/Atom feeds are fetched client-side (`src/feed/fetcher.ts`, shared helpers in `src/feed/proxy.ts`):

1. **Tier 1 — self-hosted Cloudflare Worker proxy** (`proxy/cors-proxy-worker.js`, deployed as `feeds-proxy`). Requests from inside Cloudflare's network pass the bot checks that block every public proxy on Cloudflare-protected feeds, and responses are edge-cached for 5 minutes. See the [setup guide below](#self-hosted-cors-proxy-setup-a-to-z-cloudflare-worker).
2. **Tier 2 — direct fetch** (fallback). Works when the feed itself sends CORS headers; covers the case where the Worker is unreachable or over quota.

The old public proxy tiers (Netlify, AllOrigins, Codetabs) were removed deliberately — they were intermittently blocked by Cloudflare on several South African feeds, and the Worker supersedes them. Kept here for safekeeping in case a fallback tier ever needs to be restored in `src/feed/fetcher.ts`:

- **Netlify proxy** — `https://rss-proxy-api.netlify.app/.netlify/functions/fetch-xml?url=<encoded>`
- **AllOrigins (raw)** — `https://api.allorigins.win/raw?url=<encoded>`
- **Codetabs proxy** — `https://api.codetabs.com/v1/proxy/?quest=<encoded>`
- **AllOrigins (JSON)** — `https://api.allorigins.win/get?url=<encoded>` (returns `{ contents }` JSON, needs unwrapping)

The same proxy-first strategy is used for `og:image` resolution (`src/feed/opengraph.ts`). Each request has a 15-second `AbortController` timeout, and every response body is validated to look like RSS/Atom/RDF before being accepted — proxies sometimes return their own HTML error pages with a 200 status. Errors are typed (`network`, `parsing`, `unavailable`) and surfaced as user-safe messages.

> **Local development note:** the Worker allows the production origin plus `http://localhost:*` / `http://127.0.0.1:*`, so the full proxy chain works in dev too. Any other origin gets a 403 — the Worker is not an open proxy.

### Self-Hosted CORS Proxy Setup, A to Z (Cloudflare Worker)

#### Why you need this

Some feeds (e.g. `dailyinvestor.com`, intermittently `businesstech.co.za`) sit behind Cloudflare bot protection that blocks requests from datacenter IPs. Every public CORS proxy — and the Netlify proxy — runs on datacenter IPs, so those feeds fail no matter which tier is tried. Requests that originate from *inside* Cloudflare's own network pass these checks, which is exactly what a Cloudflare Worker gives you. The Worker source lives in this repo at [`proxy/cors-proxy-worker.js`](proxy/cors-proxy-worker.js) and is locked to this app's origin so it can't be abused as an open proxy.

The free plan (100,000 requests/day) is orders of magnitude more than a feed reader needs. No credit card required.

#### Step 1 — Create a Cloudflare account

1. Go to [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) and sign up (email + password; no domain needed).
2. Verify your email — Workers won't deploy from an unverified account.

#### Step 2 — Create the Worker

> The dashboard's "Hello World" starter flow shows a **read-only** code preview — the editor only becomes available after a Worker already exists, and the flow sometimes refuses to proceed at all. Use one of the two paths below instead; both use the config at [`proxy/wrangler.toml`](proxy/wrangler.toml), which tells Cloudflare the Worker's name (`feeds-proxy`) and entry file.

**Option A: Wrangler CLI (recommended — fastest)**

Wrangler is Cloudflare's **official, first-party CLI** for Workers — authored and maintained by Cloudflare, Inc., open source (Apache-2.0) at [cloudflare/workers-sdk](https://github.com/cloudflare/workers-sdk), published on npm as [`wrangler`](https://www.npmjs.com/package/wrangler).

> **Do I need to install it?** No. `npx wrangler` downloads it on first use (to the npm cache) and runs it — nothing is added to this project's `package.json` and no global install is required. Only prerequisite: Node.js v18+, which this project already requires. If you find yourself redeploying the Worker often, a global `npm install -g wrangler` is optional, never necessary.

```bash
cd feeds-pwa/proxy
npx wrangler login     # opens browser for Cloudflare OAuth
npx wrangler deploy    # reads wrangler.toml, deploys cors-proxy-worker.js
```

On first deploy you'll be prompted to register your `workers.dev` subdomain if you don't have one. Wrangler prints the deployed URL when it finishes: `https://feeds-proxy.<your-subdomain>.workers.dev`.

**Option B: Connect the GitHub repo (auto-deploys on push)**

1. In the [Cloudflare dashboard](https://dash.cloudflare.com), go to **Workers & Pages** → **Create** → **Import a repository**.
2. Authorize GitHub access and select the `feeds-pwa` repository.
3. Set **root directory** to `proxy` and leave the deploy command as `npx wrangler deploy` — the bundled `wrangler.toml` supplies the name and entry file.
4. Click **Save and Deploy**. From then on, every push touching `proxy/` redeploys the Worker automatically.
5. The Worker URL appears on its overview page: `https://feeds-proxy.<your-subdomain>.workers.dev`.

> **What's next once the Worker is deployed?** Deploying the Worker by itself changes nothing in the app — the two are linked by one constant. In order:
>
> 1. Copy your Worker URL from the wrangler output or the Worker's overview page.
> 2. Sanity-check it from a terminal (Step 4 below).
> 3. Paste it into `CUSTOM_PROXY` in [`src/feed/fetcher.ts`](src/feed/fetcher.ts), **with `?url=` appended** (Step 5).
> 4. Rebuild and redeploy the PWA — the constant is baked in at build time (Step 6).
> 5. Hard-refresh the deployed app so the service worker updates, then confirm the previously-failing feeds load (Step 7).

#### Step 3 — Check the allowed origin

The Worker only serves requests from this app's origin. If your PWA is hosted anywhere other than `https://tshego3.github.io`, edit this line in the Worker before deploying:

```js
const ALLOWED_ORIGIN = 'https://tshego3.github.io';
```

Note: the origin is the scheme + host only — no path, no trailing slash.

#### Step 4 — Verify the Worker

Test it from a terminal against a feed that public proxies can't reach:

```bash
curl -s -H "Origin: https://tshego3.github.io" \
  "https://feeds-proxy.<your-subdomain>.workers.dev/?url=https%3A%2F%2Fdailyinvestor.com%2Ffeed%2F" | head -5
```

You should see RSS XML (`<?xml ...><rss ...`). If you get `Missing ?url= parameter`, the Worker is deployed and working — fix the URL encoding. If you get an HTML error page, see [Troubleshooting](#troubleshooting) below.

#### Step 5 — Wire it into the app

In [`src/feed/proxy.ts`](src/feed/proxy.ts), set `CUSTOM_PROXY` to your Worker URL **ending in `?url=`**:

```ts
const CUSTOM_PROXY = 'https://feeds-proxy.<your-subdomain>.workers.dev/?url=';
```

The Worker is the first tier tried for every feed fetch; a direct fetch is the fallback when it fails.

#### Step 6 — Rebuild and deploy the PWA

```bash
npm run build
npx gh-pages -d dist
```

#### Step 7 — Confirm end-to-end

1. Open the deployed app and hard-refresh (the service worker also bundles the fetcher — a stale SW will keep using the old proxy list until it updates).
2. Open DevTools → Network, refresh the feeds, and look for requests to `feeds-proxy.<your-subdomain>.workers.dev` returning 200.
3. Previously-failing feeds (dailyinvestor, businesstech) should now populate.

#### Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| `403 Forbidden` from the Worker | The request's `Origin` doesn't match `ALLOWED_ORIGIN`. Check scheme/host exactly (no trailing slash). |
| `400 Missing ?url= parameter` | `CUSTOM_PROXY` doesn't end in `?url=`, or the feed URL wasn't appended encoded. |
| Worker returns upstream HTML ("Just a moment...") | The target site is running Cloudflare's *JavaScript challenge*, which no proxy can pass. Rare for RSS endpoints; nothing to do but drop the feed. |
| Worked in `curl` but not in the app | Stale service worker — in DevTools → Application → Service Workers, click "Update"/"skipWaiting", or bump the app version and redeploy. |
| `Error 1101` / Worker exception | Open the Worker in the dashboard → **Logs** → **Begin log stream**, reproduce, and read the exception. |

#### Limits & cost

- **Free plan**: 100,000 requests/day, 10 ms CPU per request (a proxy fetch uses almost none — the time is spent waiting on the upstream, which doesn't count).
- Responses are edge-cached for 5 minutes (`cacheTtl: 300`), so repeated refreshes of the same feed often don't hit the origin at all.
- If the daily limit is ever exceeded, the Worker returns errors until midnight UTC — the app degrades gracefully to direct fetches (feeds with CORS headers keep working).

### Web Push Notifications Setup, A to Z (Cloudflare Worker)

#### Why you need this

Notifications fired by the app itself only work while the app is open. Real notifications — device locked, app closed — require **Web Push**: the browser's push service wakes the service worker, which shows the notification. That needs a server to hold push subscriptions and send [VAPID](https://datatracker.ietf.org/doc/html/rfc8292)-signed pushes. The Worker at [`push-worker/push-worker.js`](push-worker/push-worker.js) is that server, on the same free Cloudflare plan as the CORS proxy.

**How it works:**

1. When you enable "New Article Notifications" in Settings, the app subscribes with the browser's push service and POSTs the subscription plus your feed list to the Worker, which stores them in a KV namespace.
2. Every 15 minutes (cron trigger) the Worker fetches each subscriber's feeds and compares the latest article link against what it saw last time.
3. When something is new, it sends a **payload-free** push (no message encryption needed — only a VAPID JWT). The PWA's service worker wakes up, fetches the feeds itself, caches the new articles, and shows a notification with real counts.

> **iOS note:** Web Push on iPhone/iPad requires iOS 16.4+ **and** the PWA installed to the Home Screen (Share → Add to Home Screen). It does not work in a regular Safari tab.

#### Step 1 — Generate VAPID keys

VAPID is a keypair that proves pushes come from your server. Generate one with Node (no packages needed):

```bash
node -e "
const { generateKeyPairSync } = require('crypto');
const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const pub = publicKey.export({ format: 'jwk' });
const b64 = (s) => Buffer.from(s, 'base64url');
console.log('PUBLIC :', Buffer.concat([Buffer.from([4]), b64(pub.x), b64(pub.y)]).toString('base64url'));
console.log('PRIVATE:', JSON.stringify(privateKey.export({ format: 'jwk' })));
"
```

- **PUBLIC** goes in two places (they must match): `VAPID_PUBLIC_KEY` in [`push-worker/wrangler.toml`](push-worker/wrangler.toml) and `VAPID_PUBLIC_KEY` in [`src/notifications/push.ts`](src/notifications/push.ts).
- **PRIVATE** is a secret — it never goes in a file in the repo. You'll upload it in Step 4.

Also set `VAPID_SUBJECT` in `wrangler.toml` to a `mailto:` address you own (push services use it to contact you about problems).

#### Step 2 — Create the KV namespace

The Worker stores subscriptions in Workers KV:

```bash
cd feeds-pwa/push-worker
npx wrangler kv namespace create SUBS
```

Paste the printed `id` into the `[[kv_namespaces]]` block in `wrangler.toml`.

#### Step 3 — Deploy the Worker

```bash
npx wrangler deploy
```

This registers the 15-minute cron trigger automatically (from `[triggers]` in `wrangler.toml`). The Worker URL will be `https://feeds-push.<your-subdomain>.workers.dev`.

#### Step 4 — Upload the private key as a secret

```bash
npx wrangler secret put VAPID_PRIVATE_JWK
# paste the PRIVATE JSON from Step 1 when prompted
```

#### Step 5 — Wire the client

In [`src/notifications/push.ts`](src/notifications/push.ts):

```ts
const PUSH_WORKER_URL = 'https://feeds-push.<your-subdomain>.workers.dev';
const VAPID_PUBLIC_KEY = '<PUBLIC key from Step 1>';
```

As with the CORS proxy, the Worker accepts requests from the app's origin plus `http://localhost:*` / `http://127.0.0.1:*` for development — if you host anywhere other than `https://tshego3.github.io`, update `ALLOWED_ORIGIN` in `push-worker.js` too.

#### Step 6 — Rebuild, deploy, and enable

1. `npm run build` and deploy the PWA (the service worker's push handler ships inside `sw.js`).
2. Open the deployed app (on iOS: install to Home Screen first), go to **Settings → New Article Notifications**, and enable it. Grant the permission prompt.
3. Verify server-side that the subscription arrived:

```bash
npx wrangler kv key list --binding SUBS --remote
```

You should see one key (a hash of your device's push endpoint). From now on, when any of your feeds publishes a new article, the next cron tick pushes to your device — locked or not.

#### Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| Toggle enables but no KV key appears | The subscribe POST failed — check the browser console; verify `PUSH_WORKER_URL` and that `ALLOWED_ORIGIN` matches your deploy origin. |
| Notifications work in foreground but never when closed | The push subscription isn't active — on iOS confirm the app is installed to the Home Screen; on desktop check the site's notification permission isn't "ask". |
| Pushes stop after changing keys | Client and Worker keys diverged. Both `VAPID_PUBLIC_KEY` locations must hold the same value, and the private secret must be from the same pair. Re-enable notifications to re-subscribe. |
| `400 Invalid subscription payload` | Feed list exceeds the Worker's `MAX_FEEDS_PER_SUB` (200) — raise it, or trim feeds. |
| Cron never fires | Check the Worker's dashboard → Settings → Triggers shows the cron; free-tier cron requires the Worker to have been deployed with `[triggers]` present. |

#### Limits & cost

- Free plan: 100,000 Worker requests/day and 1,000 KV writes/day — a personal feed reader uses a tiny fraction (cron runs 96×/day; KV writes only happen when a feed has something new).
- Pushes carry no payload, so no push-message encryption keys are stored server-side; the KV record holds only the push endpoint, your feed URLs, and the last-seen article link per feed.

### Data Layer (IndexedDB)

Database: `feeds-db` (version 2) with three object stores:

| Store | Key | Purpose |
|-------|-----|---------|
| `subscriptions` | `id` (autoIncrement) | Feed subscription records (title, url, groupId, sortOrder, suppressHeroImage) |
| `articles` | `[feedId, link]` (+ `by-cached-at` index) | Cached feed items per subscription; records older than 7 days are pruned on startup (bookmarks are never pruned) |
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

In GitHub repo Settings > Pages, set source to the `gh-pages` branch. Run `npm run build` first so `gh-pages` publishes the current build.

The two Cloudflare Workers deploy separately with `npx wrangler deploy` from `proxy/` and `push-worker/` (see the setup guides above).

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
