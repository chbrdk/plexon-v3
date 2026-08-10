/**
 * Allowlisted embed theme ids — specs/api/assistant-embed.md
 * Keep aligned with `@msqdx/ui` token themes + product shell choices.
 */

export const ASSISTANT_EMBED_THEME_ALLOWLIST = [
  'msqdx',
  'msqdx-dark',
  'msqdx-v2',
  'msqdx-v2-dark',
  'msqdx-ui',
  'msqdx-ui-dark',
  'forest',
  'light',
  'dark',
] as const

export type AssistantEmbedThemeId = (typeof ASSISTANT_EMBED_THEME_ALLOWLIST)[number]

export function normalizeAssistantEmbedTheme(
  raw: string | null | undefined,
): AssistantEmbedThemeId | null {
  const value = (raw ?? '').trim()
  if (!value) return null
  return (ASSISTANT_EMBED_THEME_ALLOWLIST as readonly string[]).includes(value)
    ? (value as AssistantEmbedThemeId)
    : null
}

export function readDocumentThemeId(
  doc: Document | null | undefined = typeof document !== 'undefined' ? document : null,
): string | null {
  if (!doc?.documentElement) return null
  return doc.documentElement.getAttribute('data-theme')
}

export function applyAssistantEmbedTheme(themeId: string | null | undefined): boolean {
  const normalized = normalizeAssistantEmbedTheme(themeId)
  if (!normalized || typeof document === 'undefined') return false
  document.documentElement.setAttribute('data-theme', normalized)
  return true
}
