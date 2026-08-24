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
  it('averages citedShare across layers and keeps first fitness', () => {
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
      citedShare: 50,
      geoFitnessScore: 48,
      promptCount: 2,
    })
  })

  it('normalizes fractional citedShare and falls back to single geo', () => {
    expect(
      buildEqcGeoSnapshot(undefined, layer({ citedShare: 0.4, geoFitnessScore: 70, questions: ['x'] }))
    ).toEqual({
      citedShare: 40,
      geoFitnessScore: 70,
      promptCount: 1,
    })
  })
})
