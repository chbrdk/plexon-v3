import { describe, expect, it, vi, beforeEach } from 'vitest';
import { runWaybackCheckWorkflow } from '@/lib/assistant/workflows/wayback-check';

vi.mock('@/lib/db/assistant-workflow-runs', () => ({
  updateAssistantWorkflowRun: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/integrations/checkion-tools-wayback-client', () => ({
  fetchCheckionWaybackCheck: vi.fn(),
}));

import { fetchCheckionWaybackCheck } from '@/lib/integrations/checkion-tools-wayback-client';

describe('runWaybackCheckWorkflow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns wayback data on success', async () => {
    vi.mocked(fetchCheckionWaybackCheck).mockResolvedValue({
      ok: true,
      data: {
        url: 'https://example.com',
        available: true,
        firstSnapshotUrl: 'https://web.archive.org/...',
        firstSnapshotTimestamp: '20200101120000',
      },
    });
    const result = await runWaybackCheckWorkflow({ url: 'https://example.com' });
    expect(result.ok).toBe(true);
    expect(result.data?.available).toBe(true);
  });
});
