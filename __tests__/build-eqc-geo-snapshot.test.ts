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
  it('uses mean citedShare as geoScore and keeps fitness separate', () => {
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
      geoScore: 50,
      citedShare: 50,
      geoFitnessScore: 48,
      promptCount: 2,
    })
    expect(snapshot.geoScore).not.toBe(snapshot.geoFitnessScore)
  })

  it('falls back citation from own competitor SoV without blending fitness', () => {
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
      geoScore: 40,
      citedShare: 40,
      geoFitnessScore: 70,
      promptCount: 1,
    })
  })

  it('leaves geoScore null when citation is missing instead of copying fitness', () => {
    expect(
      buildEqcGeoSnapshot([layer({ measurement: 'recall', geoFitnessScore: 48, questions: ['a'] })])
    ).toEqual({
      geoScore: null,
      citedShare: null,
      geoFitnessScore: 48,
      promptCount: 1,
    })
  })
})
