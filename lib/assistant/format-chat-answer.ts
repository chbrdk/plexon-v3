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
  | { type: 'table'; headers: ChatInline[][]; rows: ChatInline[][][] }

const HEADING_RE = /^(#{1,3})\s+(.+)$/
const OL_RE = /^(\d+)[.)]\s+(.+)$/
const UL_RE = /^[-*•]\s+(.+)$/
const QUOTE_RE = /^>\s?(.*)$/
const FENCE_OPEN_RE = /^```([\w+-]*)\s*$/
const TABLE_SEP_RE = /^\|(\s*:?-+:?\s*\|)+$/
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
  // Recover GFM pipe tables flattened onto one line (`| a | |---| | b |`)
  text = text.replace(/\|\s+(?=\|)/g, '|\n')
  text = text.replace(/(^|\n)\*\*([^*\n]{2,120}?):\*\*\s*/g, '$1## $2\n\n')
  text = text.replace(/(^|\n)\*\*([^*\n]{2,120}?)\*\*:\s*/g, '$1## $2\n\n')
  text = text.replace(/(^|\n)__([^_\n]{2,120}?)__:\s*/g, '$1## $2\n\n')
  // Standalone bold line → heading (common model habit without #)
  text = text.replace(/(^|\n)\*\*([^*\n]{2,80}?)\*\*\s*(?=\n|$)/g, '$1## $2\n')
  // Bare section title between blank lines (no trailing punct / pipes)
  text = text.replace(/(^|\n\n)([^\n#|>\-*•][^\n]{1,60})\n\n/g, (full, lead: string, title: string) => {
    const t = title.trim()
    if (!t || /[.!?:]$/.test(t) || t.includes('|') || /^\d+[.)]\s/.test(t)) return full
    return `${lead}## ${t}\n\n`
  })
  text = text.replace(/([:；.!?])\s+(\d{1,2})[.)]\s+/g, '$1\n$2. ')
  text = text.replace(/(\S)\s+(\d{1,2})[.)]\s+(?=\*\*|__|[A-ZÄÖÜ])/g, '$1\n$2. ')
  text = text.replace(/\n{3,}/g, '\n\n')
  return text.trim()
}

/** GFM pipe table row (cells may omit leading/trailing pipe). */
export function isChatTableRow(line: string): boolean {
  const t = line.trim()
  if (!t.includes('|')) return false
  if (TABLE_SEP_RE.test(t)) return true
  const cells = splitChatTableCells(t)
  return cells.length >= 2
}

export function isChatTableSeparator(line: string): boolean {
  return TABLE_SEP_RE.test(line.trim())
}

export function splitChatTableCells(line: string): string[] {
  let t = line.trim()
  if (t.startsWith('|')) t = t.slice(1)
  if (t.endsWith('|')) t = t.slice(0, -1)
  return t.split('|').map((c) => c.trim())
}

function parseTableBlock(
  lines: string[],
  start: number,
): { block: Extract<ChatBlock, { type: 'table' }>; next: number } | null {
  const first = (lines[start] ?? '').trim()
  if (!isChatTableRow(first) || isChatTableSeparator(first)) return null

  const rawRows: string[][] = []
  let i = start
  let sawSeparator = false
  while (i < lines.length) {
    const row = (lines[i] ?? '').trim()
    if (!row) break
    if (!isChatTableRow(row)) break
    if (isChatTableSeparator(row)) {
      if (rawRows.length === 0) return null
      sawSeparator = true
      i += 1
      continue
    }
    rawRows.push(splitChatTableCells(row))
    i += 1
  }
  // Need header + ≥1 body row (with or without GFM separator)
  if (rawRows.length < 2) return null
  if (!sawSeparator && rawRows.length < 2) return null

  const colCount = Math.max(...rawRows.map((r) => r.length), 0)
  if (colCount < 2) return null

  const pad = (cells: string[]): string[] => {
    const next = cells.slice(0, colCount)
    while (next.length < colCount) next.push('')
    return next
  }

  const headers = pad(rawRows[0]!).map((c) => parseChatInlines(c))
  const rows = rawRows.slice(1).map((cells) => pad(cells).map((c) => parseChatInlines(c)))

  return {
    block: { type: 'table', headers, rows },
    next: i,
  }
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

    const table = parseTableBlock(lines, i)
    if (table) {
      blocks.push(table.block)
      i = table.next
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
        FENCE_OPEN_RE.test(t) ||
        isChatTableRow(t)
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
