import { describe, expect, it } from 'vitest'
import { buildEqcGeoSnapshot } from '@/lib/assistant/reports/event-quick-check/build-eqc-geo-snapshot'
import type { EventQuickCheckReportGeoSection } from '@/lib/assistant/reports/event-quick-check-report-types'

function layer(
  partial: Partial<EventQuickCheckReportGeoSection> & { measurement?: 'recall' | 'live' }
): EventQuickCheckReportGeoSection {
  return {
    status: 'complete',
    questions: [],
    competitors: [],
    eeatDimensions: [],
    recommendations: [],
    citationHighlights: [],
    ...partial,
  }
}

describe('buildEqcGeoSnapshot', () => {
  it('combines mean citedShare with fitness into geoScore', () => {
    const snapshot = buildEqcGeoSnapshot([
      layer({
        measurement: 'recall',
        citedShare: 40,
        geoFitnessScore: 48,
        questions: ['a', 'b'],
      }),
      layer({
        measurement: 'live',
        citedShare: 60,
        geoFitnessScore: null,
        questions: ['a', 'b'],
      }),
    ])
    expect(snapshot).toEqual({
      geoScore: 49, // mean(50, 48)
      citedShare: 50,
      geoFitnessScore: 48,
      promptCount: 2,
    })
  })

  it('falls back citation from own competitor SoV and single-layer geo', () => {
    expect(
      buildEqcGeoSnapshot(
        undefined,
        layer({
          url: 'https://brand.test',
          citedShare: null,
          geoFitnessScore: 70,
          questions: ['x'],
          competitors: [{ name: 'brand.test', shareOfVoice: 0.4 }],
        })
      )
    ).toEqual({
      geoScore: 55, // mean(40, 70)
      citedShare: 40,
      geoFitnessScore: 70,
      promptCount: 1,
    })
  })

  it('uses fitness alone as geoScore when citation is missing', () => {
    expect(
      buildEqcGeoSnapshot([layer({ measurement: 'recall', geoFitnessScore: 48, questions: ['a'] })])
    ).toEqual({
      geoScore: 48,
      citedShare: null,
      geoFitnessScore: 48,
      promptCount: 1,
    })
  })
})
