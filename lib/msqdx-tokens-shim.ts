/** Token constants bridged from legacy @msqdx/tokens during cutover. */
export const MSQDX_SPACING = {
  xxs: '4px',
  xs: '8px',
  sm: '12px',
  md: '16px',
  lg: '18px',
  xl: '24px',
  xxl: '32px',
} as const

export const MSQDX_TYPOGRAPHY = {
  fontFamily: {
    sans: 'var(--font-body, Inter, system-ui, sans-serif)',
    mono: 'var(--font-mono, ui-monospace, monospace)',
  },
} as const

export const MSQDX_NEUTRAL = {
  white: '#ffffff',
  black: '#0f0f0f',
} as const

export const MSQDX_BRAND_PRIMARY = {
  green: '#00ca55',
  purple: '#b638ff',
} as const

export const MSQDX_STATUS = {
  error: { base: '#ef4444' },
  warning: { base: '#f59e0b' },
  success: { base: '#10b981' },
  info: { base: '#3b82f6' },
} as const

export const MSQDX_THEME = {
  dark: {
    surface: { primary: '#1e293b' },
    text: { primary: '#ffffff', secondary: '#94a3b8' },
  },
  light: {
    surface: { primary: '#ffffff' },
    text: { primary: '#0f172a', secondary: '#475569' },
  },
} as const

export const MSQDX_EFFECTS = {
  shadowSm: '0 1px 2px rgba(0,0,0,0.2)',
} as const

export const MSQDX_BRAND_COLOR_CSS = {
  purple: 'var(--color-secondary-dx-purple)',
  green: 'var(--color-secondary-dx-green)',
  yellow: 'var(--color-secondary-dx-yellow)',
  pink: 'var(--color-secondary-dx-pink)',
  orange: 'var(--color-secondary-dx-orange)',
} as const

export const MSQDX_COLORS = {
  brand: {
    purple: '#b638ff',
    yellow: '#fef14d',
    pink: '#f256b6',
    orange: '#ff6a3b',
    green: '#00ca55',
  },
  ...MSQDX_BRAND_COLOR_CSS,
} as const
