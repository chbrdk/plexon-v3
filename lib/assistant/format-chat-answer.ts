/** Lightweight chat answer formatting — markdown-ish blocks + inline (Audion SoT + Plexon Wave 7). */

export type ChatInline =
  | { type: 'text'; value: string }
  | { type: 'strong'; value: string }
  | { type: 'em'; value: string }
  | { type: 'code'; value: string }
  | { type: 'link'; href: string; label: string }
  | { type: 'cite'; n: number }

export type ChatBlock =
  | { type: 'h'; level: 2 | 3; inlines: ChatInline[] }
  | { type: 'p'; inlines: ChatInline[] }
  | { type: 'ol'; items: ChatInline[][] }
  | { type: 'ul'; items: ChatInline[][] }
  | { type: 'quote'; inlines: ChatInline[] }
  | { type: 'code'; lang?: string; value: string }

const HEADING_RE = /^(#{1,3})\s+(.+)$/
const OL_RE = /^(\d+)[.)]\s+(.+)$/
const UL_RE = /^[-*•]\s+(.+)$/
const QUOTE_RE = /^>\s?(.*)$/
const FENCE_OPEN_RE = /^```([\w+-]*)\s*$/
const CITE_RE = /\[(\d+)\]/g
const LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g

/** Unicode emoji + common western emoticons — strip from assistant copy. */
const EMOJI_RE =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu
const EMOTICON_RE =
  /(^|\s)(?:[:;=8][-^']?[)(/\\|DpPoO]|[-^']?[:;=8]|<[\/\\]?3|\^\^)(?=\s|[.,!?]|$)/g

export function stripChatEmoticons(raw: string): string {
  return (raw ?? '')
    .replace(EMOJI_RE, '')
    .replace(EMOTICON_RE, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ ?\n ?/g, '\n')
}

export function normalizeChatMarkdown(raw: string): string {
  let text = stripChatEmoticons((raw ?? '').replace(/\r\n/g, '\n')).trim()
  if (!text) return ''
  text = text.replace(/(^|\n)\*\*([^*\n]{2,120}?):\*\*\s*/g, '$1## $2\n\n')
  text = text.replace(/(^|\n)\*\*([^*\n]{2,120}?)\*\*:\s*/g, '$1## $2\n\n')
  text = text.replace(/(^|\n)__([^_\n]{2,120}?)__:\s*/g, '$1## $2\n\n')
  text = text.replace(/([:；.!?])\s+(\d{1,2})[.)]\s+/g, '$1\n$2. ')
  text = text.replace(/(\S)\s+(\d{1,2})[.)]\s+(?=\*\*|__|[A-ZÄÖÜ])/g, '$1\n$2. ')
  text = text.replace(/\n{3,}/g, '\n\n')
  return text.trim()
}

export function parseChatBlocks(raw: string): ChatBlock[] {
  const text = normalizeChatMarkdown(raw)
  if (!text) return []

  const lines = text.split('\n')
  const blocks: ChatBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''
    const trimmed = line.trim()
    if (!trimmed) {
      i += 1
      continue
    }

    const fenceOpen = trimmed.match(FENCE_OPEN_RE)
    if (fenceOpen) {
      const lang = fenceOpen[1] || undefined
      const body: string[] = []
      i += 1
      while (i < lines.length) {
        const row = lines[i] ?? ''
        if (row.trim() === '```') {
          i += 1
          break
        }
        body.push(row)
        i += 1
      }
      blocks.push({ type: 'code', lang, value: body.join('\n') })
      continue
    }

    const heading = trimmed.match(HEADING_RE)
    if (heading) {
      const level = Math.min(3, heading[1]!.length) as 1 | 2 | 3
      blocks.push({
        type: 'h',
        level: level === 1 ? 2 : (level as 2 | 3),
        inlines: parseChatInlines(heading[2]!),
      })
      i += 1
      continue
    }

    if (QUOTE_RE.test(trimmed)) {
      const parts: string[] = []
      while (i < lines.length) {
        const row = (lines[i] ?? '').trim()
        if (!row) break
        const m = row.match(QUOTE_RE)
        if (!m) break
        parts.push(m[1] ?? '')
        i += 1
      }
      blocks.push({ type: 'quote', inlines: parseChatInlines(parts.join(' ')) })
      continue
    }

    if (OL_RE.test(trimmed)) {
      const items: ChatInline[][] = []
      while (i < lines.length) {
        const row = (lines[i] ?? '').trim()
        if (!row) break
        const m = row.match(OL_RE)
        if (!m) break
        items.push(parseChatInlines(m[2]!))
        i += 1
      }
      blocks.push({ type: 'ol', items })
      continue
    }

    if (UL_RE.test(trimmed)) {
      const items: ChatInline[][] = []
      while (i < lines.length) {
        const row = (lines[i] ?? '').trim()
        if (!row) break
        const m = row.match(UL_RE)
        if (!m) break
        items.push(parseChatInlines(m[1]!))
        i += 1
      }
      blocks.push({ type: 'ul', items })
      continue
    }

    const para: string[] = []
    while (i < lines.length) {
      const row = lines[i] ?? ''
      const t = row.trim()
      if (!t) break
      if (
        HEADING_RE.test(t) ||
        OL_RE.test(t) ||
        UL_RE.test(t) ||
        QUOTE_RE.test(t) ||
        FENCE_OPEN_RE.test(t)
      ) {
        break
      }
      para.push(t)
      i += 1
    }
    blocks.push({ type: 'p', inlines: parseChatInlines(para.join(' ')) })
  }

  return blocks
}

type MarkPart = { type: 'text' | 'strong' | 'em' | 'code'; value: string }

function parseMarks(raw: string): MarkPart[] {
  const text = raw ?? ''
  if (!text) return []
  const withMarks: MarkPart[] = []
  // Order: code fences inline, then bold (** or __), then italic (* or _)
  const markRe = /`([^`]+)`|\*\*(.+?)\*\*|__(.+?)__|(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g
  let last = 0
  for (const m of text.matchAll(markRe)) {
    const idx = m.index ?? 0
    if (idx > last) withMarks.push({ type: 'text', value: text.slice(last, idx) })
    if (m[1] != null) withMarks.push({ type: 'code', value: m[1] })
    else if (m[2] != null) withMarks.push({ type: 'strong', value: m[2] })
    else if (m[3] != null) withMarks.push({ type: 'strong', value: m[3] })
    else if (m[4] != null) withMarks.push({ type: 'em', value: m[4] })
    else if (m[5] != null) withMarks.push({ type: 'em', value: m[5] })
    last = idx + m[0].length
  }
  if (last < text.length) withMarks.push({ type: 'text', value: text.slice(last) })
  return withMarks
}

function expandLinksAndCites(value: string): ChatInline[] {
  const out: ChatInline[] = []
  let cursor = 0
  const combined = new RegExp(`${LINK_RE.source}|${CITE_RE.source}`, 'g')
  for (const m of value.matchAll(combined)) {
    const idx = m.index ?? 0
    if (idx > cursor) out.push({ type: 'text', value: value.slice(cursor, idx) })
    if (m[1] != null && m[2] != null) {
      out.push({ type: 'link', label: m[1], href: m[2] })
    } else if (m[3] != null) {
      out.push({ type: 'cite', n: Number(m[3]) })
    }
    cursor = idx + m[0].length
  }
  if (cursor < value.length) out.push({ type: 'text', value: value.slice(cursor) })
  return out
}

export function parseChatInlines(raw: string): ChatInline[] {
  const out: ChatInline[] = []
  for (const part of parseMarks(raw)) {
    if (part.type !== 'text') {
      out.push(part)
      continue
    }
    out.push(...expandLinksAndCites(part.value))
  }
  return out
}
