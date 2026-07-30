import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  enqueueEchonResearchViaMcp,
  fetchEchonMarketContextViaMcp,
} from '@/lib/integrations/echon-mcp-research-client';

vi.mock('@/lib/checkion-mcp-client', () => ({
  callCheckionMcpTool: vi.fn(),
}));

import { callCheckionMcpTool } from '@/lib/checkion-mcp-client';

describe('echon-mcp-research-client', () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...envBackup, ECHON_MCP_URL: 'http://echon-mcp:3101' };
  });

  afterEach(() => {
    process.env = envBackup;
  });

  it('enqueueEchonResearchViaMcp parses thread_id from MCP response', async () => {
    vi.mocked(callCheckionMcpTool).mockResolvedValue(
      JSON.stringify({ run_id: 'run-1', thread_id: 'thread-abc' })
    );

    const result = await enqueueEchonResearchViaMcp('Market trends for Acme');
    expect(result).toEqual({ ok: true, threadId: 'thread-abc', runId: 'run-1' });
    expect(callCheckionMcpTool).toHaveBeenCalledWith(
      'http://echon-mcp:3101',
      'echon.research_run_start',
      expect.objectContaining({ query: 'Market trends for Acme', depth: 'fast' })
    );
  });

  it('fetchEchonMarketContextViaMcp maps structured assistant answer', async () => {
    vi.mocked(callCheckionMcpTool).mockResolvedValue(
      JSON.stringify({
        id: 'thread-abc',
        messages: [
          {
            role: 'assistant',
            structured: {
              executive_summary: 'Market is growing',
              key_findings: ['B2B demand up'],
            },
          },
        ],
      })
    );

    const ctx = await fetchEchonMarketContextViaMcp('thread-abc');
    expect(ctx.available).toBe(true);
    expect(ctx.executiveSummary).toBe('Market is growing');
  });
});
