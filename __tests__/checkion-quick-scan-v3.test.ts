import { afterEach, describe, expect, it, vi } from 'vitest';
import { runCheckionQuickScan } from '@/lib/integrations/checkion-scan-client';
import { createCheckionProject } from '@/lib/integrations/checkion-project-client';
import {
  fetchCheckionScanIssues,
  runCheckionSingleScan,
} from '@/lib/integrations/checkion-scans-client';

vi.mock('@/lib/integrations/checkion-project-client', () => ({
  createCheckionProject: vi.fn(),
}));
vi.mock('@/lib/integrations/checkion-scans-client', () => ({
  runCheckionSingleScan: vi.fn(),
  fetchCheckionScanIssues: vi.fn(),
}));

describe('runCheckionQuickScan (checkion-v3 /api/scans)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('rejects empty url', async () => {
    const res = await runCheckionQuickScan({ url: '  ' });
    expect(res).toMatchObject({ ok: false, missing: ['url'] });
    expect(runCheckionSingleScan).not.toHaveBeenCalled();
  });

  it('uses bound projectId and maps /api/scans + issues into preview', async () => {
    vi.mocked(runCheckionSingleScan).mockResolvedValue({
      ok: true,
      scan: {
        id: 'scan-1',
        projectId: 'proj-1',
        mode: 'single',
        url: 'https://example.com',
        status: 'completed',
        overallScore: 82,
        issueCount: 2,
      },
    });
    vi.mocked(fetchCheckionScanIssues).mockResolvedValue({
      ok: true,
      items: [
        { id: 'i1', severity: 'critical', ruleId: 'color-contrast', title: 'Contrast' },
        { id: 'i2', severity: 'moderate', ruleId: 'link-name', title: 'Link name' },
      ],
      signals: { criticalCount: 1, seriousCount: 0, issueCount: 2, ruleIds: ['color-contrast', 'link-name'] },
    });

    const res = await runCheckionQuickScan({
      url: 'https://example.com',
      checkionProjectId: 'proj-1',
    });

    expect(createCheckionProject).not.toHaveBeenCalled();
    expect(runCheckionSingleScan).toHaveBeenCalledWith({
      projectId: 'proj-1',
      url: 'https://example.com',
      mode: 'single',
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.scan.id).toBe('scan-1');
    expect(res.scan.score).toBe(82);
    expect(res.scan.stats).toEqual({ errors: 1, warnings: 1, notices: 0, total: 2 });
    expect(res.scan.issues[0]?.code).toBe('color-contrast');
    expect(res.scan.issues[0]?.type).toBe('error');
  });

  it('creates a Checkion project when none is bound', async () => {
    vi.mocked(createCheckionProject).mockResolvedValue({
      ok: true,
      id: 'auto-proj',
      name: 'Quick Scan · example.com',
      domain: 'example.com',
    });
    vi.mocked(runCheckionSingleScan).mockResolvedValue({
      ok: true,
      scan: {
        id: 'scan-2',
        projectId: 'auto-proj',
        mode: 'single',
        url: 'https://example.com/page',
        status: 'completed',
        overallScore: 90,
        issueCount: 0,
      },
    });
    vi.mocked(fetchCheckionScanIssues).mockResolvedValue({
      ok: true,
      items: [],
      signals: { criticalCount: 0, seriousCount: 0, issueCount: 0, ruleIds: [] },
    });

    const res = await runCheckionQuickScan({ url: 'https://example.com/page', actorUserId: 'u1' });
    expect(createCheckionProject).toHaveBeenCalledWith(
      'Quick Scan · example.com',
      'example.com',
      'u1'
    );
    expect(runCheckionSingleScan).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'auto-proj', mode: 'single' })
    );
    expect(res.ok).toBe(true);
  });

  it('surfaces failed CHECKION scan status', async () => {
    vi.mocked(runCheckionSingleScan).mockResolvedValue({
      ok: true,
      scan: {
        id: 'scan-fail',
        projectId: 'proj-1',
        mode: 'single',
        url: 'https://example.com',
        status: 'failed',
        overallScore: null,
        error: 'Navigation timeout',
      },
    });

    const res = await runCheckionQuickScan({
      url: 'https://example.com',
      checkionProjectId: 'proj-1',
    });
    expect(res).toMatchObject({ ok: false, error: 'Navigation timeout' });
  });
});
