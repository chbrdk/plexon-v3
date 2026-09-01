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

import { listCollectionTestFlows, getCollectionTestFlow } from '@/lib/db/collection-test-flows';
import { listRecentCollectionFlowRuns } from '@/lib/db/collection-flow-runs';

describe('runVaillantGroupMafoFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
