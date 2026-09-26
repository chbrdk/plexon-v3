/**
 * Legacy `@msqdx/tokens` surface for board / assistant chrome.
 * Built from `@msqdx/ui-tokens` (+ fixed neutrals/spacing for Prismion board parity).
 * Do not reintroduce msqdx-design-system packages/tokens here.
 */
import { fontStacks, fontWeights, msqdxBrand, shadows } from '@msqdx/ui-tokens'

export const MSQDX_BRAND_PRIMARY = {
  purple: msqdxBrand.purple,
  yellow: msqdxBrand.yellow,
  pink: msqdxBrand.pink,
  pinkOnLight: msqdxBrand.pinkOnLight,
  orange: msqdxBrand.orange,
  green: msqdxBrand.green,
} as const

/** Theme accent CSS var with green fallback (legacy board chrome). */
export const MSQDX_BRAND_COLOR_CSS = `var(--color-theme-accent, ${MSQDX_BRAND_PRIMARY.green})`

export const MSQDX_COLORS = {
  brand: {
    purple: msqdxBrand.purple,
    yellow: msqdxBrand.yellow,
    pink: msqdxBrand.pink,
    orange: msqdxBrand.orange,
    green: msqdxBrand.green,
    white: msqdxBrand.white,
    black: msqdxBrand.black,
    pinkOnLight: msqdxBrand.pinkOnLight,
  },
} as const

export const MSQDX_NEUTRAL = {
  neutral: msqdxBrand.neutral,
  greyLight: msqdxBrand.greyLight,
  50: '#fafafa',
  100: '#f5f5f5',
  200: '#e5e5e5',
  300: '#d4d4d4',
  400: '#a3a3a3',
  500: '#737373',
  600: '#525252',
  700: '#404040',
  800: '#262626',
  900: '#171717',
  950: '#0a0a0a',
} as const

/** Board / generative-UI radii — keep legacy numeric px (not ui-tokens rem radii). */
export const MSQDX_SPACING = {
  borderRadius: {
    md: 20,
    lg: 40,
    full: 999,
  },
} as const

export const MSQDX_EFFECTS = {
  shadows: {
    sm: shadows.sm,
    lg: shadows.lg,
  },
} as const

export const MSQDX_TYPOGRAPHY = {
  fontFamily: {
    primary: '"Noto Sans JP", "Noto Sans JP Fallback", system-ui, sans-serif',
    secondary: fontStacks.mono,
    mono: fontStacks.mono,
  },
  fontSize: {
    '2xs': '0.6875rem',
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    '2xl': '1.5rem',
  },
  lineHeight: {
    tight: 1.2,
    relaxed: 1.625,
  },
  fontWeight: {
    regular: fontWeights.regular,
    semibold: fontWeights.semibold,
    bold: fontWeights.bold,
  },
  letterSpacing: {
    tight: '-0.025em',
  },
} as const
