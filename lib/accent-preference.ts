/** Shared accentPreference parsing for profile routes. */

export const ACCENT_PREFERENCE_VALUES = [
  'purple',
  'blue',
  'pink',
  'orange',
  'green',
  'yellow',
  'grey',
  'ink',
] as const

export type AccentPreferenceValue = (typeof ACCENT_PREFERENCE_VALUES)[number]

export function parseAccentPreference(raw: unknown): AccentPreferenceValue | undefined {
  if (typeof raw !== 'string') return undefined
  const t = raw.trim()
  if ((ACCENT_PREFERENCE_VALUES as readonly string[]).includes(t)) {
    return t as AccentPreferenceValue
  }
  return undefined
}

export function normalizeAccentPreference(
  raw: string | null | undefined,
): AccentPreferenceValue {
  if (raw && (ACCENT_PREFERENCE_VALUES as readonly string[]).includes(raw)) {
    return raw as AccentPreferenceValue
  }
  return 'green'
}
