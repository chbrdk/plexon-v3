import { describe, expect, it } from 'vitest'
import { buildEqcGeoLayerCompare } from '@/lib/assistant/reports/event-quick-check/build-eqc-geo-layer-compare'
import type { EventQuickCheckReportGeoSection } from '@/lib/assistant/reports/event-quick-check-report-types'

function layer(
  partial: Partial<EventQuickCheckReportGeoSection> & { measurement: 'recall' | 'live' }
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

describe('buildEqcGeoLayerCompare', () => {
  it('returns null for fewer than two layers', () => {
    expect(buildEqcGeoLayerCompare(undefined)).toBeNull()
    expect(buildEqcGeoLayerCompare([layer({ measurement: 'recall', overallScore: 50 })])).toBeNull()
  })

  it('picks the higher overallScore as winner', () => {
    const compare = buildEqcGeoLayerCompare([
      layer({ measurement: 'recall', overallScore: 52, geoFitnessScore: 40 }),
      layer({ measurement: 'live', overallScore: 61, geoFitnessScore: 55 }),
    ])
    expect(compare?.winner).toBe('live')
    expect(compare?.layers).toEqual([
      { measurement: 'recall', overallScore: 52, geoFitnessScore: 40 },
      { measurement: 'live', overallScore: 61, geoFitnessScore: 55 },
    ])
  })

  it('marks a tie when overallScores match', () => {
    const compare = buildEqcGeoLayerCompare([
      layer({ measurement: 'live', overallScore: 44 }),
      layer({ measurement: 'recall', overallScore: 44 }),
    ])
    expect(compare?.winner).toBe('tie')
  })

  it('leaves winner null when scores are missing', () => {
    const compare = buildEqcGeoLayerCompare([
      layer({ measurement: 'recall', overallScore: null }),
      layer({ measurement: 'live', overallScore: 30 }),
    ])
    expect(compare?.winner).toBeNull()
  })
})
