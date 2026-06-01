---
name: Monolithic Clarity
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c4c7c8'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c6c6c7'
  primary: '#ffffff'
  on-primary: '#2f3131'
  primary-container: '#e2e2e2'
  on-primary-container: '#636565'
  inverse-primary: '#5d5f5f'
  secondary: '#c8c6c6'
  on-secondary: '#303030'
  secondary-container: '#474747'
  on-secondary-container: '#b6b5b4'
  tertiary: '#ffffff'
  on-tertiary: '#342f2d'
  tertiary-container: '#eae1dd'
  on-tertiary-container: '#696360'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#e4e2e1'
  secondary-fixed-dim: '#c8c6c6'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#474747'
  tertiary-fixed: '#eae1dd'
  tertiary-fixed-dim: '#cec5c1'
  on-tertiary-fixed: '#1f1b19'
  on-tertiary-fixed-variant: '#4b4643'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0em
  label-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.02em
  label-xs:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 24px
  gutter: 16px
  stack-gap: 12px
  section-gap: 48px
---

## Brand & Style

The design system is centered on high-density information consumption through a lens of extreme reduction. It targets power users who value focus and digital hygiene over visual stimulation. The aesthetic is heavily influenced by modern AI interfaces: a blend of **Minimalism** and **Glassmorphism** that feels like a quiet, high-end workspace.

The emotional response should be one of "controlled focus." By removing vibrant accents and relying on a monochromatic scale, the content (the RSS feeds) becomes the only source of color and life, ensuring that the interface itself never competes for the user's attention. The UI is calm, architectural, and deeply intentional.

## Colors

The palette is a tiered monochromatic system designed to create depth without using hue. 

- **Primary Canvas (#121212):** Used for the main background to minimize eye strain.
- **Graphite (#1C1C1C):** Used for primary UI containers like sidebars and feed lists.
- **Slate Gray (#2D2D2D):** Used for elevated elements, hover states, and input backgrounds.
- **Primary Text (#F5F5F5):** An off-white to prevent "halogen" vibration on pure black backgrounds.
- **Secondary Text (#999999):** For metadata and less critical information.

Glassmorphism is reserved for global overlays (modals, dropdowns) using a semi-transparent blur of the Slate Gray color to maintain the dark aesthetic while providing spatial context.

## Typography

This design system utilizes **Inter** exclusively to achieve a systematic, utilitarian feel that remains highly readable at all sizes. 

- **Headlines:** Use tighter letter spacing and semi-bold weights to create a strong visual anchor for article titles.
- **Body Text:** Leading is increased to 1.6 to facilitate long-form reading, mirroring the experience of a premium reading app.
- **Labels:** Small caps or increased tracking are used for metadata (e.g., timestamps, source names) to differentiate them from the narrative flow without needing to change font families.

## Layout & Spacing

The layout philosophy follows a **Fluid Grid** with generous internal safe areas. 

- **Desktop:** A three-pane layout (Navigation | Feed List | Article View). The Article View is centered with a max-width of 720px to ensure optimal line lengths for reading.
- **Tablet:** The Navigation pane collapses into a drawer, while the Feed List and Article View remain side-by-side.
- **Mobile:** A single-column view with a focus on fluid transitions between the list and the reader.

Spacing is based on a 4px baseline, with 24px as the standard margin for containers to create a "breathable" atmosphere. Article list items use 16px of vertical padding to prevent the UI from feeling cramped as the feed grows.

## Elevation & Depth

Depth is conveyed through **Tonal Layers** and **Backdrop Blurs**. Shadows are avoided entirely to maintain a flat, modern architectural look.

1.  **Level 0 (Base):** Charcoal (#121212) - The main background.
2.  **Level 1 (Surface):** Graphite (#1C1C1C) - Sidebars and cards. 
3.  **Level 2 (Active/Hover):** Slate Gray (#2D2D2D) - Interaction feedback and selected states.
4.  **Floating (Overlays):** Graphite at 80% opacity with a 20px background blur. These elements use a 1px solid border of Slate Gray to define their edges against the background.

This hierarchy ensures that the user's mental model of "what sits on top of what" is based on lightness rather than physical shadows.

## Shapes

The design system uses a consistent **Rounded (2)** logic to soften the technical nature of an RSS reader. 

- **Standard Containers:** 0.5rem (8px) for buttons and small inputs.
- **Cards and Panes:** 1rem (16px) for main feed cards and the central article container.
- **Outer Wrappers:** 1.5rem (24px) for the outermost application window (when used in a desktop wrapper) or large modal overlays.

The soft corners balance the stark monochromatic palette, making the app feel approachable and "human."

## Components

### Buttons
Primary buttons are pure off-white (#F5F5F5) with black text, creating the highest point of contrast. Secondary buttons use the Slate Gray background with off-white text.

### Chips
Used for tags (e.g., "Technology," "Unread"). They should be low-profile: a Slate Gray background with Label-XS typography.

### Input Fields
Inputs are Graphite (#1C1C1C) with a subtle 1px border. On focus, the border changes to Slate Gray, and the background remains dark. No glows or shadows.

### Article Cards
Cards in the feed list do not have borders; they are separated by soft, 1px lines of Slate Gray or by generous whitespace. The title uses Headline-MD, while metadata uses Label-SM.

### Overlays (Glass)
Modals use the semi-transparent graphite with blur. They must have a "close" affordance that is clearly visible but minimal, such as a simple 'X' or "Esc" hint.

### Feed Items
In the sidebar, active feeds are indicated by a Slate Gray background and a 2px vertical "accent" line of Primary White on the left edge of the item.