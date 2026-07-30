import { describe, expect, it, vi, beforeEach } from 'vitest';
import { runDomainScanWorkflow } from '@/lib/assistant/workflows/domain-scan';

vi.mock('@/lib/db/assistant-workflow-runs', () => ({
  updateAssistantWorkflowRun: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/integrations/checkion-domain-scan-client', () => ({
  startCheckionDomainScan: vi.fn(),
  pollCheckionDomainScan: vi.fn(),
  fetchCheckionDomainScanSummary: vi.fn(),
}));

import {
  fetchCheckionDomainScanSummary,
  pollCheckionDomainScan,
  startCheckionDomainScan,
} from '@/lib/integrations/checkion-domain-scan-client';

describe('runDomainScanWorkflow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('polls domain scan and returns summary preview', async () => {
    vi.mocked(startCheckionDomainScan).mockResolvedValue({ ok: true, scanId: 'dom-1' });
    vi.mocked(pollCheckionDomainScan).mockResolvedValue({
      ok: true,
      value: { id: 'dom-1', domain: 'example.com', status: 'complete', score: 88 },
    });
    vi.mocked(fetchCheckionDomainScanSummary).mockResolvedValue({
      ok: true,
      preview: {
        id: 'dom-1',
        domain: 'example.com',
        url: 'https://example.com',
        status: 'complete',
        totalPages: 12,
        score: 88,
        stats: { errors: 2, warnings: 5, notices: 1, total: 8 },
        topIssues: [{ title: 'Missing alt', count: 3 }],
      },
    });

    const result = await runDomainScanWorkflow({ url: 'https://example.com' });
    expect(result.ok).toBe(true);
    expect(result.scan?.totalPages).toBe(12);
  });
});
