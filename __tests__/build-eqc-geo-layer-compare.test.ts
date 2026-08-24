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
    expect(buildEqcGeoLayerCompare([layer({ measurement: 'recall', citedShare: 50 })])).toBeNull()
  })

  it('picks the higher citedShare as winner', () => {
    const compare = buildEqcGeoLayerCompare([
      layer({ measurement: 'recall', citedShare: 52, geoFitnessScore: 40 }),
      layer({ measurement: 'live', citedShare: 61, geoFitnessScore: 55 }),
    ])
    expect(compare?.winner).toBe('live')
    expect(compare?.layers).toEqual([
      { measurement: 'recall', citedShare: 52, geoFitnessScore: 40 },
      { measurement: 'live', citedShare: 61, geoFitnessScore: 55 },
    ])
  })

  it('marks a tie when citedShares match', () => {
    const compare = buildEqcGeoLayerCompare([
      layer({ measurement: 'live', citedShare: 44 }),
      layer({ measurement: 'recall', citedShare: 44 }),
    ])
    expect(compare?.winner).toBe('tie')
  })

  it('leaves winner null when citedShares are missing', () => {
    const compare = buildEqcGeoLayerCompare([
      layer({ measurement: 'recall', citedShare: null }),
      layer({ measurement: 'live', citedShare: 30 }),
    ])
    expect(compare?.winner).toBeNull()
  })
})
