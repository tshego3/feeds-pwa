import { createTheme, type MantineColorsTuple } from '@mantine/core';

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

export const tokens = {
  background: '#131313',
  surface: '#1C1C1C',
  elevated: '#2D2D2D',
  textPrimary: '#F5F5F5',
  textSecondary: '#999999',
  accent: '#FFFFFF',
  border: '#2D2D2D',
} as const;

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
