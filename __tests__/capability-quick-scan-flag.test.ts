import { afterEach, describe, expect, it, vi } from 'vitest';
import { runQuickScanWorkflow } from '@/lib/assistant/workflows/quick-scan';
import { ENV_CAPABILITY_CATALOG_RUNTIME } from '@/lib/capabilities/runtime-flag';
import { executeCheckionScanCapability } from '@/lib/capabilities/executors/checkion-scan';
import { runCheckionQuickScan } from '@/lib/integrations/checkion-scan-client';

vi.mock('@/lib/capabilities/executors/checkion-scan', () => ({
  executeCheckionScanCapability: vi.fn(),
}));
vi.mock('@/lib/integrations/checkion-scan-client', () => ({
  runCheckionQuickScan: vi.fn(),
}));
vi.mock('@/lib/assistant/auto-assign-checkion', () => ({
  tryAutoAssignCheckionResource: vi.fn().mockResolvedValue({ assigned: false }),
}));
vi.mock('@/lib/assistant/workflows/workflow-step-stream', () => ({
  patchWorkflowSteps: vi.fn(async ({ steps, stepId, patch }) =>
    steps.map((s: { id: string }) => (s.id === stepId ? { ...s, ...patch } : s))
  ),
}));

describe('runQuickScanWorkflow catalog flag', () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env[ENV_CAPABILITY_CATALOG_RUNTIME];
  });

  it('uses legacy quick scan when flag off', async () => {
    vi.mocked(runCheckionQuickScan).mockResolvedValue({
      ok: true,
      scan: {
        id: 'legacy-1',
        url: 'https://legacy.test',
        score: 90,
        stats: { errors: 0, warnings: 0, notices: 0, total: 0 },
        issues: [],
      },
    });

    const out = await runQuickScanWorkflow({ url: 'https://legacy.test' });
    expect(out.ok).toBe(true);
    expect(out.scan?.id).toBe('legacy-1');
    expect(executeCheckionScanCapability).not.toHaveBeenCalled();
    expect(runCheckionQuickScan).toHaveBeenCalledOnce();
  });

  it('uses capability executor when flag on', async () => {
    process.env[ENV_CAPABILITY_CATALOG_RUNTIME] = '1';
    vi.mocked(executeCheckionScanCapability).mockResolvedValue({
      ok: true,
      catalogRoot: 'scan',
      catalogBundle: { overallScore: 88 },
      agentPayload: {
        variant: 'agent',
        scan: {
          id: 'cap-1',
          url: 'https://cap.test',
          score: 88,
          stats: { errors: 0, warnings: 0, notices: 0, total: 0 },
          issues: [],
        },
      },
    });

    const out = await runQuickScanWorkflow({
      url: 'https://cap.test',
      checkionProjectId: 'ck-9',
    });
    expect(out.ok).toBe(true);
    expect(out.scan?.id).toBe('cap-1');
    expect(executeCheckionScanCapability).toHaveBeenCalledWith(
      { url: 'https://cap.test' },
      expect.objectContaining({ source: 'agent', checkionProjectId: 'ck-9' })
    );
    expect(runCheckionQuickScan).not.toHaveBeenCalled();
  });
});
