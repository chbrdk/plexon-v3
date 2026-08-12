import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import {
  buildEqcMagazinePdfChapters,
  buildEqcMagazinePdfPageGroups,
  buildEventQuickCheckReportPages,
  EqcMagazinePdfDocument,
} from '@/lib/assistant/reports/pdf/eqc-magazine-pdf'
import { buildEventQuickCheckReportModel } from '@/lib/assistant/reports/build-event-quick-check-report-model'
import { buildEventQuickCheckReportBlock } from '@/lib/assistant/reports/build-event-quick-check-report-block'
import {
  eventQuickCheckBvikFixture,
  eventQuickCheckBvikNarrativeFixture,
} from '@/__tests__/fixtures/event-quick-check-report.fixture'
import { renderAssistantReportPdfLocal } from '@/lib/assistant/reports/render-assistant-report-pdf-local'
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types'

describe('buildEqcMagazinePdfChapters', () => {
  it('builds magazine chapter keys matching screen bands', () => {
    const report = buildEventQuickCheckReportModel(
      eventQuickCheckBvikFixture(),
      eventQuickCheckBvikNarrativeFixture(),
    )
    const keys = buildEqcMagazinePdfChapters(report)
    expect(keys[0]).toBe('cover')
    expect(keys).toContain('domain')
    expect(keys).toContain('distributions')
    expect(keys).toContain('persona')
    expect(keys).toContain('appendix')
    expect(buildEventQuickCheckReportPages(report).map((p) => p.key)).toEqual(keys)
  })

  it('packs multiple chapters onto fewer pages when content is light', () => {
    const report = buildEventQuickCheckReportModel(
      eventQuickCheckBvikFixture(),
      eventQuickCheckBvikNarrativeFixture(),
    )
    const keys = buildEqcMagazinePdfChapters(report)
    const groups = buildEqcMagazinePdfPageGroups(report)
    expect(groups[0]).toEqual(['cover'])
    expect(groups.flat()).toEqual(keys)
    expect(groups.length).toBeLessThan(keys.length)
  })
})

describe('EqcMagazinePdfDocument', () => {
  it('renders a valid magazine PDF buffer', async () => {
    const report = buildEventQuickCheckReportModel(eventQuickCheckBvikFixture())
    const buffer = await renderToBuffer(<EqcMagazinePdfDocument report={report} />)
    const pdf = Buffer.from(buffer)
    expect(pdf.subarray(0, 4).toString('utf8')).toBe('%PDF')
    expect(pdf.length).toBeGreaterThan(3000)
  }, 30000)

  it('local assistant PDF uses magazine quick check document', async () => {
    const report = buildEventQuickCheckReportModel(eventQuickCheckBvikFixture())
    const blockResult = buildEventQuickCheckReportBlock(report)
    expect(blockResult.ok).toBe(true)
    if (!blockResult.ok) return

    const pdf = await renderAssistantReportPdfLocal({
      title: report.meta.title,
      uiLayout: {
        version: UI_LAYOUT_VERSION,
        blocks: [blockResult.block],
      },
    })
    expect(pdf.subarray(0, 4).toString('utf8')).toBe('%PDF')
    expect(pdf.length).toBeGreaterThan(3000)
  }, 30000)
})
