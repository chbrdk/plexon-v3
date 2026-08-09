import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EventQuickCheckResultsMasthead } from '@/components/event-quick-check/EventQuickCheckResultsMasthead'
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types'

function baseReport(
  overrides: Partial<EventQuickCheckReportModel> = {},
): EventQuickCheckReportModel {
  return {
    templateId: 'event_quick_check',
    meta: {
      title: 'Quick Check: Beispiel AG',
      url: 'https://www.beispiel.de',
      domain: 'beispiel.de',
      projectName: 'Beispiel',
      generatedAt: new Date().toISOString(),
      playbookLabel: 'Quick Check',
    },
    executive: {
      summary: 'Kurzes Fazit zur Domain und GEO-Lage.',
      kpiTiles: [],
    },
    workflow: { steps: [] },
    domain: {
      score: 78,
      totalPages: 50,
      stats: { errors: 2, warnings: 0, passed: 10, notices: 0 },
      topIssues: [],
      status: 'done',
    },
    geo: {
      status: 'done',
      overallScore: 62,
      competitors: [],
      eeatDimensions: [],
      recommendations: [],
      questions: [],
      citationHighlights: [],
    },
    appendix: { steps: [], notes: [] },
    ...overrides,
  } as EventQuickCheckReportModel
}

describe('EventQuickCheckResultsMasthead', () => {
  it('renders domain hero score, metrics, and host copy', () => {
    const kpiTiles = [
      { label: 'Domain-Score', value: 78, unit: '/100' },
      { label: 'Seiten gescannt', value: 50 },
      { label: 'A11y-Fehler', value: 2 },
      { label: 'Personas', value: 3 },
      { label: 'GEO-Score', value: 62, unit: '/100' },
    ]
    const { container } = render(
      <EventQuickCheckResultsMasthead
        report={baseReport()}
        kpiTiles={kpiTiles}
        generatedAt="gerade eben"
        personaCount={3}
        actions={<button type="button">PDF</button>}
      />,
    )

    expect(container.querySelector('.plexon-eqc-masthead')).toBeTruthy()
    expect(container.querySelector('.plexon-eqc-cover__score-num')?.textContent).toBe('78')
    expect(screen.getByText('beispiel.de')).toBeTruthy()
    expect(screen.getByText('Quick Check: Beispiel AG')).toBeTruthy()
    expect(screen.getByText('Seiten gescannt')).toBeTruthy()
    expect(screen.getByText('50')).toBeTruthy()
    expect(screen.getByText('PDF')).toBeTruthy()
    expect(container.querySelector('[data-tone="pos"]')).toBeTruthy()
  })
})
