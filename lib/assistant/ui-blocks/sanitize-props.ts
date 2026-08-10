import { stripChatEmoticons } from '@/lib/assistant/format-chat-answer'

/** Recursively strip emoji / emoticons from UI block prop trees. */
export function sanitizeUiBlockProps(value: unknown): unknown {
  if (typeof value === 'string') return stripChatEmoticons(value).trim()
  if (Array.isArray(value)) return value.map(sanitizeUiBlockProps)
  if (value != null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = sanitizeUiBlockProps(child)
    }
    return out
  }
  return value
}

export function sanitizeUiCellText(value: string | number | null | undefined): string {
  if (value == null || value === '') return '—'
  if (typeof value === 'number') return String(value)
  const cleaned = stripChatEmoticons(value).trim()
  return cleaned || '—'
}
