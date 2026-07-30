import { describe, expect, it, vi, beforeEach } from 'vitest';
import { runSslCheckWorkflow } from '@/lib/assistant/workflows/ssl-check';

vi.mock('@/lib/db/assistant-workflow-runs', () => ({
  updateAssistantWorkflowRun: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/integrations/checkion-tools-ssl-client', () => ({
  fetchCheckionSslCheck: vi.fn(),
}));

import { fetchCheckionSslCheck } from '@/lib/integrations/checkion-tools-ssl-client';

describe('runSslCheckWorkflow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns ssl data on success', async () => {
    vi.mocked(fetchCheckionSslCheck).mockResolvedValue({
      ok: true,
      data: { host: 'example.com', grade: 'A', status: 'READY' },
    });
    const result = await runSslCheckWorkflow({ host: 'https://example.com' });
    expect(result.ok).toBe(true);
    expect(result.data?.grade).toBe('A');
  });
});
