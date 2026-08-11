import { afterEach, describe, expect, it, vi } from 'vitest';
import { executeCheckionScanCapability } from '@/lib/capabilities/executors/checkion-scan';
import { ENV_CAPABILITY_CATALOG_RUNTIME } from '@/lib/capabilities/runtime-flag';
import { runCheckionQuickScan } from '@/lib/integrations/checkion-scan-client';
import { runCheckionSingleScan } from '@/lib/integrations/checkion-scans-client';
import { resolveCatalogPath, setContextBundle, emptyRunContext } from '@/lib/collection-flow-run-context';

vi.mock('@/lib/integrations/checkion-scan-client', () => ({
  runCheckionQuickScan: vi.fn(),
}));
vi.mock('@/lib/integrations/checkion-scans-client', () => ({
  runCheckionSingleScan: vi.fn(),
}));

describe('executeCheckionScanCapability (C1.1)', () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env[ENV_CAPABILITY_CATALOG_RUNTIME];
  });

  it('agent path uses quick scan and writes scan.* catalog', async () => {
    vi.mocked(runCheckionQuickScan).mockResolvedValue({
      ok: true,
      scan: {
        id: 'qs-1',
        url: 'https://agent.test',
        score: 77,
        stats: { errors: 2, warnings: 1, notices: 0, total: 3 },
        issues: [{ code: 'color-contrast', type: 'error', message: 'Contrast', selector: 'h1' }],
      },
    });

    const result = await executeCheckionScanCapability(
      { url: 'https://agent.test' },
      { source: 'agent', checkionProjectId: 'ck-1' }
    );

    expect(result.ok).toBe(true);
    expect(runCheckionQuickScan).toHaveBeenCalledOnce();
    expect(runCheckionSingleScan).not.toHaveBeenCalled();
    expect(result.agentPayload?.variant).toBe('agent');
    expect(result.catalogRoot).toBe('scan');

    const ctx = setContextBundle(emptyRunContext(), 'scan', result.catalogBundle!);
    expect(resolveCatalogPath(ctx, 'scan.overallScore')).toBe(77);
    expect(resolveCatalogPath(ctx, 'scan.url')).toBe('https://agent.test');
    expect(resolveCatalogPath(ctx, 'scan.issues.criticalCount')).toBe(2);
  });

  it('flow path uses platform single scan and writes scan.* catalog', async () => {
    vi.mocked(runCheckionSingleScan).mockResolvedValue({
      ok: true,
      scan: {
        id: 'fs-1',
        projectId: 'ck-1',
        mode: 'single',
        url: 'https://flow.test',
        status: 'completed',
        overallScore: 77,
        issueCount: 3,
      },
    });

    const result = await executeCheckionScanCapability(
      { url: 'https://flow.test', scanMode: 'single', stepUrl: 'https://flow.test' },
      {
        source: 'flow',
        checkionProjectId: 'ck-1',
        platformProjectId: 'pp-1',
        nodeId: 'n-scan',
      }
    );

    expect(result.ok).toBe(true);
    expect(runCheckionSingleScan).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'ck-1',
        url: 'https://flow.test',
        mode: 'single',
        platformProjectId: 'pp-1',
      })
    );
    expect(runCheckionQuickScan).not.toHaveBeenCalled();
    expect(result.agentPayload?.variant).toBe('flow');

    const ctx = setContextBundle(emptyRunContext(), 'scan', result.catalogBundle!);
    expect(resolveCatalogPath(ctx, 'scan.overallScore')).toBe(77);
    expect(resolveCatalogPath(ctx, 'scan.url')).toBe('https://flow.test');
  });

  it('rejects missing url and missing flow projectId', async () => {
    expect(
      await executeCheckionScanCapability({}, { source: 'agent' })
    ).toMatchObject({ ok: false, error: 'URL fehlt' });

    expect(
      await executeCheckionScanCapability(
        { url: 'https://x.test' },
        { source: 'flow', checkionProjectId: null }
      )
    ).toMatchObject({ ok: false, error: 'Checkion projectId fehlt' });
  });
});
