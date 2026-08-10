import { describe, expect, it } from 'vitest'
import { resolveEventQuickCheckDashboardLayout } from '@/lib/assistant/event-quick-check/resolve-event-quick-check-dashboard-layout'
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types'

function baseReport(
  overrides: Partial<EventQuickCheckReportModel> = {},
): EventQuickCheckReportModel {
  return {
    templateId: 'event_quick_check',
    meta: {
      title: 'T',
      url: 'https://example.com',
      domain: 'example.com',
      generatedAt: '2026-08-10T00:00:00.000Z',
    },
    executive: { summary: '', kpiTiles: [] },
    workflow: { steps: [] },
    domain: null,
    geo: {
      status: 'complete',
      questions: [],
      competitors: [],
      eeatDimensions: [],
      recommendations: [],
      citationHighlights: [],
    },
    appendix: { stepTable: { columns: [], rows: [] }, links: [] },
    ...overrides,
  } as EventQuickCheckReportModel
}

describe('resolveEventQuickCheckDashboardLayout — E-E-A-T / recs bands', () => {
  it('keeps geoSpan for core GEO even when eeat+recs exist', () => {
    const layout = resolveEventQuickCheckDashboardLayout(
      baseReport({
        geo: {
          ...baseReport().geo,
          overallScore: 62,
          eeatDimensions: [{ key: 'experience', label: 'Experience', score: 40 }],
          recommendations: [{ title: 'A', description: 'B', priority: 1 }],
        },
      }),
    )
    expect(layout.geoSpan).toBeGreaterThan(0)
    expect(layout.showGeoEeat).toBe(true)
    expect(layout.showGeoRecommendations).toBe(true)
  })

  it('does not open GEO core band for eeat/recs alone', () => {
    const layout = resolveEventQuickCheckDashboardLayout(
      baseReport({
        geo: {
          ...baseReport().geo,
          eeatDimensions: [{ key: 'experience', label: 'Experience', score: 40 }],
          recommendations: [{ title: 'A', description: 'B', priority: 1 }],
        },
      }),
    )
    expect(layout.geoSpan).toBe(0)
    expect(layout.showGeoEeat).toBe(true)
    expect(layout.showGeoRecommendations).toBe(true)
  })
})
