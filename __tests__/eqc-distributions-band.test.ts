import { describe, expect, it } from 'vitest'
import {
  hasDomainScanDistributions,
  mapDomainOverviewToDistributions,
} from '@/lib/integrations/map-domain-scan-distributions'
import { buildEventQuickCheckReportModel } from '@/lib/assistant/reports/build-event-quick-check-report-model'
import { resolveEventQuickCheckDashboardLayout } from '@/lib/assistant/event-quick-check/resolve-event-quick-check-dashboard-layout'
import {
  eventQuickCheckBvikFixture,
  eventQuickCheckBvikNarrativeFixture,
} from '@/__tests__/fixtures/event-quick-check-report.fixture'

describe('mapDomainOverviewToDistributions', () => {
  it('maps readability, eco, and link aggregates', () => {
    const dist = mapDomainOverviewToDistributions({
      ux: {
        readabilityGrade: 'Complex (College)',
        readabilityScore: 10.2,
        dwellSecondsMedian: 571,
        readabilityBands: { easy: 0, standard: 22, complex: 26, veryComplex: 2 },
      },
      eco: {
        grade: 'C',
        avgCo2: 1.02,
        gradeDistribution: { C: 26, D: 7, E: 3, F: 14 },
      },
      links: { internal: 19689, external: 656, broken: 0, total: 20345 },
    })
    expect(dist?.readability?.bands).toHaveLength(3)
    expect(dist?.readability?.score).toBe(10.2)
    expect(dist?.eco?.grades.map((g) => g.id)).toEqual(['C', 'D', 'E', 'F'])
    expect(dist?.links?.broken).toBe(0)
    expect(dist?.links?.total).toBe(20345)
    expect(hasDomainScanDistributions(dist)).toBe(true)
  })

  it('returns undefined when no positive slices', () => {
    expect(
      mapDomainOverviewToDistributions({
        ux: { readabilityBands: { easy: 0, standard: 0, complex: 0, veryComplex: 0 } },
      }),
    ).toBeUndefined()
    expect(hasDomainScanDistributions(undefined)).toBe(false)
  })
})

describe('EQC report model + layout — distributions', () => {
  it('copies domainScan.distributions onto the report and enables the band', () => {
    const report = buildEventQuickCheckReportModel(
      eventQuickCheckBvikFixture(),
      eventQuickCheckBvikNarrativeFixture(),
    )
    expect(report.distributions?.readability?.bands[0]?.label).toBe('Standard')
    expect(report.distributions?.eco?.grade).toBe('C')
    expect(report.distributions?.links?.total).toBe(20345)
    const layout = resolveEventQuickCheckDashboardLayout(report)
    expect(layout.showDistributions).toBe(true)
  })

  it('hides the band when distributions are absent', () => {
    const base = eventQuickCheckBvikFixture()
    const report = buildEventQuickCheckReportModel(
      {
        ...base,
        domainScan: base.domainScan
          ? { ...base.domainScan, distributions: undefined }
          : undefined,
      },
      eventQuickCheckBvikNarrativeFixture(),
    )
    expect(report.distributions).toBeUndefined()
    expect(resolveEventQuickCheckDashboardLayout(report).showDistributions).toBe(false)
  })
})
