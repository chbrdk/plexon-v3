import { describe, expect, it } from 'vitest'
import { buildEqcEeatReadingFallback } from '@/lib/assistant/reports/event-quick-check/build-eqc-eeat-reading'

describe('buildEqcEeatReadingFallback', () => {
  it('prefers geo fitness reasoning and lists gaps', () => {
    const line = buildEqcEeatReadingFallback({
      dimensions: [{ key: 'trust', label: 'Trust', score: 80 }],
      geoFitnessReasoning: 'Pages lack structured FAQ blocks',
      missingElements: ['FAQs', 'Author'],
    })
    expect(line).toMatch(/FAQ/)
    expect(line).toMatch(/FAQs/)
  })

  it('falls back to span narrative', () => {
    const line = buildEqcEeatReadingFallback({
      dimensions: [
        { key: 'experience', label: 'Experience', score: 40 },
        { key: 'trust', label: 'Trust', score: 80 },
      ],
      weakest: { key: 'experience', label: 'Experience', score: 40 },
      strongest: { key: 'trust', label: 'Trust', score: 80 },
    })
    expect(line).toMatch(/Experience/)
    expect(line).toMatch(/Trust/)
  })
})
