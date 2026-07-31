/**
 * Brand accent selection — drives DS `--accent` and legacy `--color-theme-accent`.
 */

export const BRAND_COLOR_STORAGE_KEY = 'plexon-sidebar-color'
export const BRAND_COLOR_DEFAULT = '--color-secondary-dx-green'

export const LIGHT_ACCENT_COLORS = [
  '--color-secondary-dx-yellow',
  '--color-secondary-dx-grey-light',
  '--color-secondary-dx-green',
] as const

export function isLightAccentColor(varName: string): boolean {
  return (LIGHT_ACCENT_COLORS as readonly string[]).includes(varName)
}

export type BrandColorOption = {
  varName: string
  preview: string
  textColor: string
}

export const BRAND_COLOR_OPTIONS: BrandColorOption[] = [
  { varName: '--color-secondary-dx-purple', preview: '#b638ff', textColor: '#ffffff' },
  { varName: '--color-secondary-dx-blue', preview: '#3b82f6', textColor: '#ffffff' },
  { varName: '--color-secondary-dx-pink', preview: '#f256b6', textColor: '#ffffff' },
  { varName: '--color-secondary-dx-orange', preview: '#ff6a3b', textColor: '#ffffff' },
  { varName: '--color-secondary-dx-green', preview: '#00ca55', textColor: '#000000' },
  { varName: '--color-secondary-dx-yellow', preview: '#fef14d', textColor: '#000000' },
  { varName: '--color-secondary-dx-grey-light', preview: '#d4d2d2', textColor: '#000000' },
  { varName: '--audion-light-border-color', preview: '#0f172a', textColor: '#ffffff' },
]

const COLOR_TINT_MAP: Record<string, string> = {
  '--color-secondary-dx-purple': '--color-secondary-dx-purple-tint',
  '--color-secondary-dx-blue': '--color-secondary-dx-blue-tint',
  '--color-secondary-dx-pink': '--color-secondary-dx-pink-tint',
  '--color-secondary-dx-orange': '--color-secondary-dx-orange-tint',
  '--color-secondary-dx-green': '--color-secondary-dx-green-tint',
  '--color-secondary-dx-yellow': '--color-secondary-dx-yellow-tint',
  '--color-secondary-dx-grey-light': '--color-secondary-dx-grey-light-tint',
  '--audion-light-border-color': '--color-secondary-dx-purple-tint',
}

function resolveAccentHex(varName: string): string {
  if (typeof document !== 'undefined') {
    const computed = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
    if (computed) return computed
  }
  return BRAND_COLOR_OPTIONS.find((o) => o.varName === varName)?.preview ?? '#00ca55'
}

/**
 * Apply selected brand color globally.
 * Sets both `@msqdx/ui` `--accent` (buttons, fields, chrome) and Plexon `--color-theme-accent`.
 */
export function applyBrandColorVars(varName: string, _themeMode: 'light' | 'dark' = 'dark'): void {
  if (typeof document === 'undefined') return

  const option = BRAND_COLOR_OPTIONS.find((o) => o.varName === varName)
  const resolvedColor = resolveAccentHex(varName)
  if (!resolvedColor) return

  const root = document.documentElement
  const textOnAccent = option?.textColor ?? '#ffffff'
  const isLight = textOnAccent === '#000000'
  const tintVar = COLOR_TINT_MAP[varName] ?? '--color-secondary-dx-purple-tint'
  const tintComputed =
    getComputedStyle(root).getPropertyValue(tintVar).trim() ||
    `color-mix(in srgb, ${resolvedColor} 22%, transparent)`

  // Design-system accent (Button primary, Field focus, chips, …)
  root.style.setProperty('--accent', resolvedColor)

  // Plexon / legacy accent aliases
  root.style.setProperty('--color-theme-accent', resolvedColor)
  root.style.setProperty('--color-theme-accent-tint', tintComputed)
  root.style.setProperty('--color-theme-accent-contrast', textOnAccent)

  root.style.setProperty('--audion-light-border-color', resolvedColor)
  root.style.setProperty('--audion-light-html-background-color', resolvedColor)
  root.style.setProperty('--audion-sidebar-text-color', textOnAccent)
  root.style.setProperty(
    '--audion-sidebar-hover-bg',
    isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)',
  )
  root.style.setProperty(
    '--audion-sidebar-active-bg',
    isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)',
  )
  root.style.setProperty('--auth-logo-color', textOnAccent)
  root.style.setProperty('--auth-button-text-color', textOnAccent)

  const labelShouldBeBlack =
    varName === '--color-secondary-dx-yellow' || varName === '--color-secondary-dx-grey-light'
  root.style.setProperty(
    '--color-input-label',
    labelShouldBeBlack ? '#000000' : resolvedColor,
  )
}

export function initBrandColorFromStorage(themeMode: 'light' | 'dark' = 'dark'): void {
  const saved =
    typeof localStorage !== 'undefined' ? localStorage.getItem(BRAND_COLOR_STORAGE_KEY) : null
  const colorVar = saved ?? BRAND_COLOR_DEFAULT
  applyBrandColorVars(colorVar, themeMode)
}
