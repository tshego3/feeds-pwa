---
name: feeds-pwa-design-system
description: Monolithic Clarity dark theme and UI rules for feeds-pwa. Use when creating or editing ANY component, screen, style, layout, color, font, icon, animation, or accessibility concern - covers Mantine theming, the color palette, typography, spacing, interaction patterns, and asset rules.
---

# Design System and UI Rules (Monolithic Clarity)

Full specification lives in `docs/design-system.md`. `src/theme/` is the single source of visual truth, consumed by `MantineProvider` at app initialization (mirrors native Theme.swift).

## Theming Rules

1. **No hardcoded colors, font families, or spacing values in components** - use Mantine theme tokens, component props (`color`, `variant`, `size`), or CSS variables (`var(--mantine-color-*)`) exclusively.
2. If a component needs a design token in TypeScript, import from `src/theme/` - never inline the value.
3. Never override `MantineProvider` in child components.
4. **Consult the Mantine component API first** (https://mantine.dev/core/) before building custom UI - use `Paper`, `Card`, `AppShell`, `TextInput`, `ActionIcon`, `Modal`, etc.
5. Use Mantine hooks (`useMediaQuery`, `useDisclosure`) for responsive behavior and UI state.

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| Background/Canvas (Charcoal) | `#131313` | Main app background |
| Surface (Graphite) | `#1C1C1C` | Containers, sidebar, feed lists |
| Elevated (Slate Gray) | `#2D2D2D` | Hover states, active elements, inputs |
| Primary Text (Off-White) | `#F5F5F5` | Main content text |
| Secondary Text (Muted) | `#999999` | Metadata, timestamps |
| Accent (White) | `#FFFFFF` | Active indicators, primary buttons |

- Depth through **tonal layering only** - no shadows. Background lightness tiers convey elevation.
- Glassmorphism for overlays: 80% opacity + 20px backdrop blur + 1px Slate Gray border.
- Soft 1px dividers using Slate Gray - no heavy borders.

## Typography

1. **Inter** is the sole font family (Google Fonts or self-hosted in `public/fonts/`). No secondary fonts.
2. Headlines: tight letter-spacing (`-0.02em`), semi-bold. Body: 1.6 line-height. Labels: increased tracking.
3. Use Mantine `Title` and `Text` components; scale comes exclusively from the theme.

## Shape and Spacing

1. Rounded corners: 8px standard, 16px cards, 24px outer wrappers.
2. 4px baseline grid. Container padding: 24px desktop, 16px mobile.

## Styling Rules

1. **No `.module.css` files.** Centralize style objects if needed and import them.
2. Mobile-first responsive design: base styles target phone viewport; min-width media queries scale up. Test at 360px, 768px, 1280px+.
3. No `!important` unless overriding third-party styles with no alternative.
4. Animations must respect `prefers-reduced-motion`.

## Screen Specifications

1. **AppShell**: bottom tab navigation (mobile), left sidebar with grouped feed navigation (desktop). Tabs: Home, Bookmarks, Search, Settings.
2. **Dashboard**: bento layout mirroring native DashboardView - FeaturedArticleCard (hero + overlay) + ArticleCard grid + CompactArticleRow list.
3. **Feed Sidebar**: hierarchical - standalone feeds as rows, grouped feeds as expandable sections, selected feed shows indicator.
4. **Article cards** (all respect `suppressHeroImage` per feed): FeaturedArticleCard (large hero + title overlay), ArticleCard (image, title, truncated description, date), CompactArticleRow (small thumbnail row).
5. **Article Reading View**: in-app HTML rendering, theme-aware CSS injection, bookmark toggle.
6. **Add/Manage Feeds**: bottom sheet (mobile) / modal (desktop) - title, URL, group, suppress hero toggle; swipe-to-delete.
7. **Search**: sticky top bar, instant filtering across titles/descriptions, horizontally scrollable category chips.
8. **Settings**: appearance mode cycle (Auto/Light/Dark/Monochrome), JSON/OPML export/import, clear cache, manage feeds, about.

## Interaction Patterns

1. Pull-to-refresh: silent refresh, no loading spinner.
2. Auto-refresh every 15 minutes; "New Articles" banner on new content (auto-dismiss after 5s).
3. Cards: subtle scale transform on press. Smooth page transitions.
4. Desktop hover: Slate Gray background transition; active nav: 2px left white accent border.
5. Loading skeletons while feeds fetch.

## Accessibility

1. Semantic HTML (`<nav>`, `<main>`, `<section>`, `<button>`, `<article>`) - no `<div>` for interactive elements.
2. All inputs have `<label>`s. Keyboard navigation works everywhere; do not disable Mantine's `focusRing`.
3. ARIA only when semantic HTML is insufficient. Single `<h1>`, logical heading order, skip-to-content link.
4. Touch targets minimum 44px. Text contrast minimum 4.5:1 (WCAG AA).
5. Article cards: proper heading hierarchy, alt text, clear link purpose.

## Asset Rules

1. **All images and visual assets must be real** - supplied by the business or approved stock. Strictly no AI-generated images or assets.
2. Missing asset: themed placeholder container with `<!-- TODO: replace with real asset -->` comment.
3. `@tabler/icons-react` for all UI icons. PWA icon is `public/favicon.svg` (any + maskable).

## Performance

1. Dynamic `import()` for screens/heavy modules (Vite code splitting). Import only needed Mantine components.
2. Lazy-load hero images below the fold. Paginate or virtualize long lists.
3. WebP/AVIF for photos, SVG for icons. Defer non-critical scripts/styles.
4. Audit bundle with `npx vite-bundle-visualizer` before major deploys.
