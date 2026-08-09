/**
 * Split long insight assessment into magazine paragraphs.
 * Caps length so findings/carousel carry the detail, not a wall of prose.
 */
export const EQC_ASSESSMENT_MAX_SENTENCES = 4

export function splitInsightSentences(text: string): string[] {
  const trimmed = text.trim().replace(/\s+/g, ' ')
  if (!trimmed) return []
  const matches = trimmed.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g)
  if (!matches?.length) return [trimmed]
  return matches.map((s) => s.trim()).filter(Boolean)
}

/** Group sentences into short paragraphs (lede alone, then pairs). */
export function formatInsightProse(
  text: string,
  opts?: { maxSentences?: number },
): string[] {
  const max = opts?.maxSentences ?? EQC_ASSESSMENT_MAX_SENTENCES
  const byBlank = text
    .trim()
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean)

  let sentences: string[]
  if (byBlank.length > 1) {
    sentences = byBlank.flatMap((block) => splitInsightSentences(block))
  } else {
    sentences = splitInsightSentences(text)
  }

  if (!sentences.length) return []
  const capped = sentences.slice(0, max)
  if (capped.length <= 2) return [capped.join(' ')]

  const paras: string[] = [capped[0]!]
  for (let i = 1; i < capped.length; i += 2) {
    paras.push(capped.slice(i, i + 2).join(' '))
  }
  return paras
}
