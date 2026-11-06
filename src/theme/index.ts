import { createTheme, type CSSVariablesResolver, type MantineColorsTuple } from '@mantine/core';

const dark: MantineColorsTuple = [
  '#F5F5F5', // 0 - primary text
  '#999999', // 1 - secondary text
  '#2D2D2D', // 2 - elevated/slate
  '#1C1C1C', // 3 - surface/graphite
  '#131313', // 4 - background/canvas
  '#0D0D0D', // 5
  '#080808', // 6
  '#131313', // 7 - dark variant
  '#1C1C1C', // 8
  '#2D2D2D', // 9
];

// Monolithic Clarity palettes. Dark mirrors native Theme.swift; light keeps
// the same tonal layering, inverted (lighter surfaces sit higher). These two
// maps are the single source of color values; components read `tokens`,
// which point at CSS variables that follow the system color scheme.
const DARK = {
  background: '#131313',
  surface: '#131313',
  surfaceContainerLow: '#1C1B1B',
  surfaceContainerHigh: '#2A2A2A',
  surfaceVariant: '#353534',
  elevated: '#2D2D2D',
  primary: '#FFFFFF',
  onPrimary: '#131313',
  onSurface: '#E5E2E1',
  onSurfaceVariant: '#C4C7C8',
  secondaryContainer: '#303030',
  outline: '#8E9192',
  outlineVariant: '#444748',
  error: '#FFAB0B',
  textPrimary: '#FFFFFF',
  textSecondary: '#C4C7C8',
  accent: '#FFFFFF',
  border: '#444748',
} as const;

type TokenName = keyof typeof DARK;

const LIGHT: Readonly<Record<TokenName, string>> = {
  background: '#F5F5F3',
  surface: '#F5F5F3',
  surfaceContainerLow: '#FFFFFF',
  surfaceContainerHigh: '#EAEAE8',
  surfaceVariant: '#E0E0DD',
  elevated: '#E6E6E4',
  primary: '#131313',
  onPrimary: '#FFFFFF',
  onSurface: '#1C1B1B',
  onSurfaceVariant: '#46494B',
  secondaryContainer: '#E2E2E0',
  outline: '#74777A',
  outlineVariant: '#D4D6D7',
  error: '#8A4F00',
  textPrimary: '#131313',
  textSecondary: '#4A4D50',
  accent: '#131313',
  border: '#D4D6D7',
};

const TOKEN_NAMES = Object.keys(DARK) as TokenName[];

function cssVar(name: TokenName): string {
  return `--fd-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
}

export const tokens = Object.fromEntries(
  TOKEN_NAMES.map((name) => [name, `var(${cssVar(name)})`]),
) as Readonly<Record<TokenName, string>>;

// Translucent version of a token, e.g. alpha(tokens.surface, 80) for glass
// overlays. Works with CSS variables, unlike appending hex alpha digits.
export function alpha(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

// Height of the iOS status bar / notch area. index.html sets
// viewport-fit=cover + black-translucent, so on iOS the page draws under the
// status bar and every top-anchored element must clear this inset. It is 0 on
// Android and desktop, so the padding is a no-op there.
export const SAFE_TOP = 'env(safe-area-inset-top, 0px)';

function toVariables(palette: Readonly<Record<TokenName, string>>): Record<string, string> {
  return Object.fromEntries(TOKEN_NAMES.map((name) => [cssVar(name), palette[name]]));
}

// Emitted by MantineProvider under the active color scheme ("auto" follows
// the system setting).
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: toVariables(LIGHT),
  dark: toVariables(DARK),
});

export const theme = createTheme({
  primaryColor: 'dark',
  colors: { dark },
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  headings: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    fontWeight: '600',
  },
  radius: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  defaultRadius: 'sm',
  other: {
    tokens,
  },
});
