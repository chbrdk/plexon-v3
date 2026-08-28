/** Shared themePreference parsing for profile routes. */

export const THEME_PREFERENCE_VALUES = ['light', 'dark', 'auto'] as const
export type ThemePreferenceValue = (typeof THEME_PREFERENCE_VALUES)[number]

export function parseThemePreference(raw: unknown): ThemePreferenceValue | undefined {
  if (typeof raw !== 'string') return undefined
  const t = raw.trim()
  if ((THEME_PREFERENCE_VALUES as readonly string[]).includes(t)) {
    return t as ThemePreferenceValue
  }
  return undefined
}

export function normalizeThemePreference(
  raw: string | null | undefined,
): ThemePreferenceValue {
  if (raw && (THEME_PREFERENCE_VALUES as readonly string[]).includes(raw)) {
    return raw as ThemePreferenceValue
  }
  return 'dark'
}
