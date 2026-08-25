import { describe, expect, it } from 'vitest'
import { resolveEqcCitedShare } from '@/lib/assistant/reports/event-quick-check/resolve-eqc-cited-share'
import type { EventQuickCheckReportGeoSection } from '@/lib/assistant/reports/event-quick-check-report-types'

function layer(
  partial: Partial<EventQuickCheckReportGeoSection>
): EventQuickCheckReportGeoSection {
  return {
    status: 'complete',
    questions: [],
    competitors: [],
    eeatDimensions: [],
    recommendations: [],
    citationHighlights: [],
    url: 'https://brand.test',
    ...partial,
  }
}

describe('resolveEqcCitedShare', () => {
  it('prefers persisted citedShare', () => {
    expect(resolveEqcCitedShare(layer({ citedShare: 55 }))).toBe(55)
    expect(resolveEqcCitedShare(layer({ citedShare: 0.4 }))).toBe(40)
  })

  it('recovers from own competitor SoV when scalar is missing', () => {
    expect(
      resolveEqcCitedShare(
        layer({
          citedShare: null,
          competitors: [{ name: 'brand.test', shareOfVoice: 0.62 }],
        })
      )
    ).toBe(62)
  })

  it('recovers from citation dossier runs when scalar is 0/null', () => {
    expect(
      resolveEqcCitedShare(
        layer({
          citedShare: 0,
          questions: ['q1', 'q2'],
          citationHighlightsByModel: [
            {
              modelId: 'gpt-5.6-terra',
              modelLabel: 'Terra',
              citations: [],
              runs: [
                {
                  query: 'q1',
                  citations: [{ domain: 'brand.test', position: 1 }],
                },
                {
                  query: 'q2',
                  citations: [{ domain: 'rival.example', position: 1 }],
                },
              ],
            },
          ],
        })
      )
    ).toBe(50)
  })
})
