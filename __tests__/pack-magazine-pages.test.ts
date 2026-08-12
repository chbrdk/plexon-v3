import { describe, expect, it } from 'vitest'
import {
  estimateEqcChapterWeight,
  packEqcMagazinePages,
  MAG_PACK_BUDGET,
  MAG_PACK_BREATHING,
  MAG_PACK_MAX_PER_PAGE,
} from '@/lib/assistant/reports/pdf/magazine/pack-magazine-pages'
import { buildEqcMagazinePdfChapters } from '@/lib/assistant/reports/pdf/eqc-magazine-pdf'
import { buildEventQuickCheckReportModel } from '@/lib/assistant/reports/build-event-quick-check-report-model'
import {
  eventQuickCheckBvikFixture,
  eventQuickCheckBvikNarrativeFixture,
} from '@/__tests__/fixtures/event-quick-check-report.fixture'

describe('packEqcMagazinePages', () => {
  it('keeps cover solo and packs lighter chapters without reordering', () => {
    const report = buildEventQuickCheckReportModel(
      eventQuickCheckBvikFixture(),
      eventQuickCheckBvikNarrativeFixture(),
    )
    const keys = buildEqcMagazinePdfChapters(report)
    const pages = packEqcMagazinePages(keys, report)

    expect(pages[0]).toEqual(['cover'])
    expect(pages.flat()).toEqual(keys)
    expect(pages.length).toBeLessThan(keys.length)

    for (const page of pages) {
      expect(page.length).toBeGreaterThan(0)
      expect(page.length).toBeLessThanOrEqual(MAG_PACK_MAX_PER_PAGE)
    }
  })

  it('forces solo when estimated weight fills the soft page budget', () => {
    const report = buildEventQuickCheckReportModel(eventQuickCheckBvikFixture())
    const weight = estimateEqcChapterWeight('cover', report)
    expect(weight).toBeGreaterThanOrEqual(MAG_PACK_BUDGET - MAG_PACK_BREATHING - 20)

    const pages = packEqcMagazinePages(['cover', 'appendix'], report)
    expect(pages[0]).toEqual(['cover'])
    expect(pages.some((p) => p.includes('appendix'))).toBe(true)
  })

  it('assigns positive weights for known chapter keys', () => {
    const report = buildEventQuickCheckReportModel(
      eventQuickCheckBvikFixture(),
      eventQuickCheckBvikNarrativeFixture(),
    )
    for (const key of buildEqcMagazinePdfChapters(report)) {
      expect(estimateEqcChapterWeight(key, report)).toBeGreaterThan(0)
    }
  })
})
