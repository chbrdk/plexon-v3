import { describe, expect, it, vi, beforeEach } from 'vitest';
import { runVaillantGroupMafoFlow } from '@/lib/demo/run-vaillant-group-mafo-flow';
import { VAILLANT_GROUP_PLATFORM_PROJECT_ID } from '@/lib/demo/vaillant-group-mafo';

vi.mock('@/lib/db/collection-test-flows', () => ({
  listCollectionTestFlows: vi.fn(),
  getCollectionTestFlow: vi.fn(),
}));

vi.mock('@/lib/db/collection-flow-runs', () => ({
  listRecentCollectionFlowRuns: vi.fn(),
  createCollectionFlowRun: vi.fn(),
  patchCollectionFlowRun: vi.fn(),
}));

vi.mock('@/lib/collection-flow-execute', () => ({
  executeCollectionFlowRun: vi.fn(),
}));

vi.mock('@/lib/demo/ensure-vaillant-checkion-corpus', () => ({
  ensureVaillantCheckionCorpus: vi.fn(),
  spinesForMafoFlowKind: vi.fn((kind: string) => (kind === 'uc2' ? ['b2c', 'b2b'] : ['b2c'])),
  documentHasDomainScanNode: vi.fn(() => false),
}));

vi.mock('@/lib/integrations/checkion-domain-scans-v3-client', () => ({
  fetchCheckionDomainScanV3Detail: vi.fn(),
}));

import { listCollectionTestFlows, getCollectionTestFlow } from '@/lib/db/collection-test-flows';
import { listRecentCollectionFlowRuns, createCollectionFlowRun, patchCollectionFlowRun } from '@/lib/db/collection-flow-runs';
import { executeCollectionFlowRun } from '@/lib/collection-flow-execute';
import { ensureVaillantCheckionCorpus, documentHasDomainScanNode } from '@/lib/demo/ensure-vaillant-checkion-corpus';
import { fetchCheckionDomainScanV3Detail } from '@/lib/integrations/checkion-domain-scans-v3-client';

describe('runVaillantGroupMafoFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ensureVaillantCheckionCorpus).mockResolvedValue({
      ok: true,
      platformProjectId: VAILLANT_GROUP_PLATFORM_PROJECT_ID,
      checkionProjectId: 'proj-checkion',
      spines: [{ ok: true, spine: 'b2c', scanId: 'domain-1', pageCount: 20 }],
    });
  });

  it('skips UC2 when a completed run already exists', async () => {
    vi.mocked(listCollectionTestFlows).mockResolvedValue([
      {
        id: 'flow-uc2',
        templateId: 'vaillant-installer-dual-v1',
        name: 'UC2',
        flow: { templateId: 'vaillant-installer-dual-v1', nodes: [], edges: [] },
      },
    ] as never);
    vi.mocked(getCollectionTestFlow).mockResolvedValue({
      id: 'flow-uc2',
      flow: { templateId: 'vaillant-installer-dual-v1', nodes: [], edges: [], lastRun: { status: 'complete' } },
    } as never);
    vi.mocked(listRecentCollectionFlowRuns).mockResolvedValue([]);

    const result = await runVaillantGroupMafoFlow({
      platformProjectId: VAILLANT_GROUP_PLATFORM_PROJECT_ID,
      kind: 'uc2',
      ifPending: true,
    });

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.flowId).toBe('flow-uc2');
  });

  it('refuses non-Vaillant collections', async () => {
    const result = await runVaillantGroupMafoFlow({
      platformProjectId: '00000000-0000-0000-0000-000000000099',
      kind: 'uc1',
    });
    expect(result.ok).toBe(false);
  });

  it('fails when domain_scan step did not reach completed', async () => {
    vi.mocked(documentHasDomainScanNode).mockReturnValue(true);
    vi.mocked(listCollectionTestFlows).mockResolvedValue([
      {
        id: 'flow-uc1',
        templateId: 'vaillant-barrier-research-v1',
        name: 'UC1',
        flow: { templateId: 'vaillant-barrier-research-v1', nodes: [{ kind: 'domain_scan' }], edges: [] },
      },
    ] as never);
    vi.mocked(getCollectionTestFlow).mockResolvedValue({
      id: 'flow-uc1',
      name: 'UC1',
      flow: { templateId: 'vaillant-barrier-research-v1', nodes: [{ kind: 'domain_scan' }], edges: [] },
    } as never);
    vi.mocked(listRecentCollectionFlowRuns).mockResolvedValue([]);
    vi.mocked(createCollectionFlowRun).mockResolvedValue({ id: 'run-1' } as never);
    vi.mocked(executeCollectionFlowRun).mockResolvedValue({
      ok: true,
      lastRun: { status: 'running', domainScanId: 'domain-99' },
      verdict: { status: 'pending' },
    } as never);
    vi.mocked(fetchCheckionDomainScanV3Detail).mockResolvedValue({
      ok: true,
      scan: {
        id: 'domain-99',
        projectId: 'p',
        url: 'https://www.vaillant.de/',
        status: 'running',
        overallScore: null,
      },
    });
    vi.mocked(patchCollectionFlowRun).mockResolvedValue(undefined as never);

    const result = await runVaillantGroupMafoFlow({
      platformProjectId: VAILLANT_GROUP_PLATFORM_PROJECT_ID,
      kind: 'uc1',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('not completed');
  });
});
