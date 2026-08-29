/**
 * Brand accent selection — thin wrapper over @msqdx/ui accentPreference.
 * Keeps legacy localStorage key for first-paint migrate.
 */

import {
  applyAccentPreference,
  migrateLegacyAccent,
  type AccentPreference,
} from '@msqdx/ui'

export const BRAND_COLOR_STORAGE_KEY = 'plexon-sidebar-color'
export const BRAND_COLOR_DEFAULT = 'green' as AccentPreference

export function applyBrandColorVars(
  raw: string,
  _themeMode: 'light' | 'dark' = 'dark',
): void {
  applyAccentPreference(migrateLegacyAccent(raw))
}

export function initBrandColorFromStorage(_themeMode: 'light' | 'dark' = 'dark'): void {
  const saved =
    typeof localStorage !== 'undefined' ? localStorage.getItem(BRAND_COLOR_STORAGE_KEY) : null
  applyAccentPreference(migrateLegacyAccent(saved ?? BRAND_COLOR_DEFAULT))
}

export function persistAccentPreference(id: AccentPreference): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(BRAND_COLOR_STORAGE_KEY, id)
  } catch {
    /* ignore */
  }
}
