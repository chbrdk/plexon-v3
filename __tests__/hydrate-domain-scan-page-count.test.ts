import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  hydrateDomainScanPageCount,
  hydrateEventQuickCheckReportDomainPages,
} from '@/lib/assistant/event-quick-check/hydrate-domain-scan-page-count';

vi.mock('@/lib/integrations/checkion-domain-scans-v3-client', () => ({
  fetchCheckionDomainScanV3Preview: vi.fn(),
}));

import { fetchCheckionDomainScanV3Preview } from '@/lib/integrations/checkion-domain-scans-v3-client';

describe('hydrateDomainScanPageCount', () => {
  afterEach(() => {
    vi.mocked(fetchCheckionDomainScanV3Preview).mockReset();
  });

  it('keeps scan when pages and stats already set', async () => {
    const scan = {
      id: 'domain-1',
      domain: 'example.com',
      url: 'https://example.com',
      status: 'completed',
      score: 80,
      totalPages: 42,
      stats: { errors: 3, warnings: 0, notices: 0, total: 3 },
      topIssues: [{ title: 'x', count: 1 }],
    };
    await expect(hydrateDomainScanPageCount(scan)).resolves.toEqual(scan);
    expect(fetchCheckionDomainScanV3Preview).not.toHaveBeenCalled();
  });

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
    });
    const hydrated = await hydrateDomainScanPageCount({
      id: 'domain-1',
      domain: 'example.com',
      url: 'https://example.com',
      status: 'completed',
      score: 79,
      totalPages: 50,
      stats: { errors: 0, warnings: 0, notices: 0, total: 0 },
      topIssues: [],
    });
    expect(hydrated?.stats.errors).toBe(120);
    expect(hydrated?.topIssues[0]?.title).toContain('Iframe');
  });

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
    });
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
      'domain-fallback'
    );
    expect(report?.domain?.totalPages).toBe(50);
    expect(report?.domain?.stats.errors).toBe(120);
    expect(report?.executive.kpiTiles.find((k) => k.label === 'Seiten gescannt')?.value).toBe(50);
    expect(report?.executive.kpiTiles.find((k) => k.label === 'A11y-Fehler')?.value).toBe(120);
  });
});
