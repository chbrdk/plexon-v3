import { describe, expect, it } from 'vitest'
import {
  formatInsightProse,
  splitInsightSentences,
} from '@/lib/assistant/insights/format-insight-prose'

describe('format-insight-prose', () => {
  it('splits sentences and caps long dumps into short paragraphs', () => {
    const wall =
      'Die Quick Check-Analyse liefert 10 bewertbare Signale. Fact one ends here. Fact two ends here. Fact three ends here. Fact four ends here. Fact five ends here.'
    expect(splitInsightSentences(wall).length).toBe(6)
    const paras = formatInsightProse(wall)
    expect(paras[0]).toContain('10 bewertbare Signale')
    expect(paras.join(' ')).not.toContain('Fact five')
    expect(paras.length).toBeGreaterThan(1)
  })

  it('keeps short assessments as one block', () => {
    expect(formatInsightProse('Kurzes Fazit. Noch ein Satz.')).toEqual([
      'Kurzes Fazit. Noch ein Satz.',
    ])
  })
})
