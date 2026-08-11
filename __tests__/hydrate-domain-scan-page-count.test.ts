import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  hydrateDomainScanPageCount,
  hydrateEventQuickCheckReportDomainPages,
  hydrateEventQuickCheckReportDistributions,
} from '@/lib/assistant/event-quick-check/hydrate-domain-scan-page-count'

vi.mock('@/lib/integrations/checkion-domain-scans-v3-client', () => ({
  fetchCheckionDomainScanV3Preview: vi.fn(),
  fetchCheckionDomainScanV3Overview: vi.fn(),
  findCheckionDomainScanIdByUrl: vi.fn(),
}))

import {
  fetchCheckionDomainScanV3Overview,
  fetchCheckionDomainScanV3Preview,
  findCheckionDomainScanIdByUrl,
} from '@/lib/integrations/checkion-domain-scans-v3-client'

describe('hydrateDomainScanPageCount', () => {
  afterEach(() => {
    vi.mocked(fetchCheckionDomainScanV3Preview).mockReset()
    vi.mocked(fetchCheckionDomainScanV3Overview).mockReset()
    vi.mocked(findCheckionDomainScanIdByUrl).mockReset()
  })

  it('keeps scan when pages and stats already set and distributions present', async () => {
    const scan = {
      id: 'domain-1',
      domain: 'example.com',
      url: 'https://example.com',
      status: 'completed',
      score: 80,
      totalPages: 42,
      stats: { errors: 3, warnings: 0, notices: 0, total: 3 },
      topIssues: [{ title: 'x', count: 1 }],
      distributions: {
        links: {
          slices: [{ id: 'internal', label: 'Internal', value: 10 }],
          internal: 10,
          external: 0,
          broken: 0,
          total: 10,
        },
      },
    }
    await expect(hydrateDomainScanPageCount(scan)).resolves.toEqual(scan)
    expect(fetchCheckionDomainScanV3Preview).not.toHaveBeenCalled()
    expect(fetchCheckionDomainScanV3Overview).not.toHaveBeenCalled()
  })

  it('backfills distributions on an otherwise complete scan', async () => {
    vi.mocked(fetchCheckionDomainScanV3Overview).mockResolvedValue({
      ok: true,
      overview: {
        links: { internal: 100, external: 5, broken: 0, total: 105 },
      },
    })
    const hydrated = await hydrateDomainScanPageCount({
      id: 'domain-1',
      domain: 'example.com',
      url: 'https://example.com',
      status: 'completed',
      score: 80,
      totalPages: 42,
      stats: { errors: 3, warnings: 0, notices: 0, total: 3 },
      topIssues: [{ title: 'x', count: 1 }],
    })
    expect(fetchCheckionDomainScanV3Preview).not.toHaveBeenCalled()
    expect(hydrated?.distributions?.links?.total).toBe(105)
  })

  it('refetches when pages set but a11y stats empty', async () => {
    vi.mocked(fetchCheckionDomainScanV3Preview).mockResolvedValue({
      ok: true,
      preview: {
        id: 'domain-1',
        domain: 'example.com',
        url: 'https://example.com',
        status: 'complete',
        score: 79,
        totalPages: 50,
        stats: { errors: 120, warnings: 0, notices: 0, total: 120 },
        topIssues: [{ title: 'Iframe title', count: 48 }],
      },
    })
    const hydrated = await hydrateDomainScanPageCount({
      id: 'domain-1',
      domain: 'example.com',
      url: 'https://example.com',
      status: 'completed',
      score: 79,
      totalPages: 50,
      stats: { errors: 0, warnings: 0, notices: 0, total: 0 },
      topIssues: [],
    })
    expect(hydrated?.stats.errors).toBe(120)
    expect(hydrated?.topIssues[0]?.title).toContain('Iframe')
  })

  it('hydrates report KPIs from fallback scan id', async () => {
    vi.mocked(fetchCheckionDomainScanV3Preview).mockResolvedValue({
      ok: true,
      preview: {
        id: 'domain-fallback',
        domain: 'mv.de',
        url: 'https://mv.de',
        status: 'complete',
        score: 79,
        totalPages: 50,
        stats: { errors: 120, warnings: 0, notices: 0, total: 120 },
        topIssues: [{ title: 'Iframe', count: 48 }],
      },
    })
    const report = await hydrateEventQuickCheckReportDomainPages(
      {
        templateId: 'event_quick_check',
        meta: {
          title: 't',
          url: 'https://mv.de',
          domain: 'mv.de',
          projectName: 'MV',
          generatedAt: new Date().toISOString(),
          playbookLabel: 'Quick Check',
        },
        executive: {
          kpiTiles: [
            { label: 'Domain-Score', value: 79 },
            { label: 'Seiten gescannt', value: 0 },
            { label: 'A11y-Fehler', value: 0 },
          ],
        },
        workflow: { steps: [] },
        domain: {
          scanId: 'unknown',
          domain: 'mv.de',
          url: 'https://mv.de',
          status: 'completed',
          score: 79,
          totalPages: 0,
          stats: { errors: 0, warnings: 0, notices: 0, total: 0 },
          topIssues: [],
          checkionHref: '#',
        },
        geo: {
          status: 'skipped',
          overallScore: null,
          geoFitnessScore: null,
          citedShare: null,
          questions: [],
          competitors: [],
          eeatDimensions: [],
          recommendations: [],
          citationHighlights: [],
        },
        appendix: { stepTable: { columns: [], rows: [] }, links: [] },
      },
      'domain-fallback',
    )
    expect(report?.domain?.totalPages).toBe(50)
    expect(report?.domain?.stats.errors).toBe(120)
    expect(report?.executive.kpiTiles.find((k) => k.label === 'Seiten gescannt')?.value).toBe(50)
    expect(report?.executive.kpiTiles.find((k) => k.label === 'A11y-Fehler')?.value).toBe(120)
  })

  it('resolves scan via URL when scanId unknown', async () => {
    vi.mocked(findCheckionDomainScanIdByUrl).mockResolvedValue('domain-by-url')
    vi.mocked(fetchCheckionDomainScanV3Preview).mockResolvedValue({
      ok: true,
      preview: {
        id: 'domain-by-url',
        domain: 'muenchener-verein.de',
        url: 'https://www.muenchener-verein.de/',
        status: 'complete',
        score: 79,
        totalPages: 50,
        stats: { errors: 120, warnings: 0, notices: 0, total: 120 },
        topIssues: [{ title: 'Iframe', count: 48 }],
      },
    })
    const report = await hydrateEventQuickCheckReportDomainPages({
      templateId: 'event_quick_check',
      meta: {
        title: 't',
        url: 'https://www.muenchener-verein.de/',
        domain: 'muenchener-verein.de',
        projectName: 'MV',
        generatedAt: new Date().toISOString(),
        playbookLabel: 'Quick Check',
      },
      executive: {
        kpiTiles: [
          { label: 'Domain-Score', value: 79 },
          { label: 'Seiten gescannt', value: 0 },
          { label: 'A11y-Fehler', value: 0 },
        ],
      },
      workflow: { steps: [] },
      domain: {
        scanId: 'unknown',
        domain: 'muenchener-verein.de',
        url: 'https://www.muenchener-verein.de/',
        status: 'completed',
        score: 79,
        totalPages: 0,
        stats: { errors: 0, warnings: 0, notices: 0, total: 0 },
        topIssues: [],
        checkionHref: '#',
      },
      geo: {
        status: 'skipped',
        questions: [],
        competitors: [],
        eeatDimensions: [],
        recommendations: [],
        citationHighlights: [],
      },
      appendix: { stepTable: { columns: [], rows: [] }, links: [] },
    })
    expect(findCheckionDomainScanIdByUrl).toHaveBeenCalled()
    expect(report?.domain?.totalPages).toBe(50)
    expect(report?.executive.kpiTiles.find((k) => k.label === 'A11y-Fehler')?.value).toBe(120)
  })
})

describe('hydrateEventQuickCheckReportDistributions', () => {
  afterEach(() => {
    vi.mocked(fetchCheckionDomainScanV3Overview).mockReset()
    vi.mocked(findCheckionDomainScanIdByUrl).mockReset()
  })

  it('attaches overview distributions to a complete stored report', async () => {
    vi.mocked(fetchCheckionDomainScanV3Overview).mockResolvedValue({
      ok: true,
      overview: {
        ux: {
          readabilityGrade: 'Complex',
          readabilityScore: 10.2,
          readabilityBands: { easy: 0, standard: 22, complex: 26, veryComplex: 2 },
        },
        eco: { grade: 'C', avgCo2: 1.02, gradeDistribution: { C: 26, D: 7 } },
        links: { internal: 100, external: 5, broken: 0, total: 105 },
      },
    })
    const report = await hydrateEventQuickCheckReportDistributions({
      templateId: 'event_quick_check',
      meta: {
        title: 't',
        url: 'https://example.com',
        domain: 'example.com',
        projectName: 'Ex',
        generatedAt: new Date().toISOString(),
        playbookLabel: 'Quick Check',
      },
      executive: { kpiTiles: [] },
      workflow: { steps: [] },
      domain: {
        scanId: 'scan-complete',
        domain: 'example.com',
        url: 'https://example.com',
        status: 'complete',
        score: 60,
        totalPages: 50,
        stats: { errors: 10, warnings: 0, notices: 0, total: 10 },
        topIssues: [{ title: 'x', count: 1 }],
        checkionHref: '#',
      },
      geo: {
        status: 'skipped',
        questions: [],
        competitors: [],
        eeatDimensions: [],
        recommendations: [],
        citationHighlights: [],
      },
      appendix: { scanId: 'scan-complete', stepTable: { columns: [], rows: [] }, links: [] },
    })
    expect(report?.distributions?.readability?.bands).toHaveLength(3)
    expect(report?.distributions?.eco?.grade).toBe('C')
    expect(report?.distributions?.links?.total).toBe(105)
  })

  it('no-ops when distributions already present', async () => {
    const existing = {
      links: {
        slices: [{ id: 'internal', label: 'Internal', value: 1 }],
        internal: 1,
        external: 0,
        broken: 0,
        total: 1,
      },
    }
    const report = await hydrateEventQuickCheckReportDistributions({
      templateId: 'event_quick_check',
      meta: {
        title: 't',
        url: 'https://example.com',
        domain: 'example.com',
        projectName: 'Ex',
        generatedAt: new Date().toISOString(),
        playbookLabel: 'Quick Check',
      },
      executive: { kpiTiles: [] },
      workflow: { steps: [] },
      domain: {
        scanId: 'scan-complete',
        domain: 'example.com',
        url: 'https://example.com',
        status: 'complete',
        score: 60,
        totalPages: 50,
        stats: { errors: 10, warnings: 0, notices: 0, total: 10 },
        topIssues: [{ title: 'x', count: 1 }],
        checkionHref: '#',
      },
      distributions: existing,
      geo: {
        status: 'skipped',
        questions: [],
        competitors: [],
        eeatDimensions: [],
        recommendations: [],
        citationHighlights: [],
      },
      appendix: { stepTable: { columns: [], rows: [] }, links: [] },
    })
    expect(fetchCheckionDomainScanV3Overview).not.toHaveBeenCalled()
    expect(report?.distributions).toEqual(existing)
  })
})
