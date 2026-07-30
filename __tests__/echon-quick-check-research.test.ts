import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  buildQuickCheckMarketResearchQuery,
  echonQuickCheckMissingEnvMessage,
  finalizeEchonQuickCheckResearch,
  formatEchonEnqueueUserMessage,
  isEchonQuickCheckResearchEnabled,
  startEchonQuickCheckResearch,
} from '@/lib/assistant/event-quick-check/echon-quick-check-research';

vi.mock('@/lib/integrations/echon-research-async-client', () => ({
  enqueueEchonResearchRun: vi.fn(),
}));

vi.mock('@/lib/integrations/echon-mcp-research-client', () => ({
  enqueueEchonResearchViaMcp: vi.fn(),
  fetchEchonMarketContextViaMcp: vi.fn(),
  isEchonMcpResearchAvailable: vi.fn(),
}));

vi.mock('@/lib/integrations/echon-market-context', () => ({
  fetchEchonMarketContext: vi.fn(),
  emptyEchonMarketContext: (reason?: string) => ({ available: false, reason }),
}));

import { enqueueEchonResearchRun } from '@/lib/integrations/echon-research-async-client';
import { enqueueEchonResearchViaMcp, isEchonMcpResearchAvailable } from '@/lib/integrations/echon-mcp-research-client';
import { fetchEchonMarketContext } from '@/lib/integrations/echon-market-context';

describe('echon-quick-check-research', () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...envBackup,
      ECHON_API_URL: 'http://echon-v2-api:8000',
      ECHON_SERVICE_TOKEN: 'tok',
    };
    vi.mocked(isEchonMcpResearchAvailable).mockReturnValue(false);
  });

  afterEach(() => {
    process.env = envBackup;
  });

  it('buildQuickCheckMarketResearchQuery includes project and domain context', () => {
    const q = buildQuickCheckMarketResearchQuery('Acme GmbH', 'acme.de');
    expect(q).toContain('Acme GmbH');
    expect(q).toContain('acme.de');
    expect(q).toContain('Quick Check');
  });

  it('startEchonQuickCheckResearch enqueues via server API when MCP unavailable', async () => {
    vi.mocked(isEchonMcpResearchAvailable).mockReturnValue(false);
    vi.mocked(enqueueEchonResearchRun).mockResolvedValue({
      ok: true,
      threadId: 'thread-1',
      runId: 'run-1',
    });

    const started = await startEchonQuickCheckResearch('Acme', 'https://acme.de');
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.handle.threadId).toBe('thread-1');
    expect(enqueueEchonResearchRun).toHaveBeenCalledWith(
      expect.stringContaining('Acme'),
      expect.objectContaining({
        depth: 'fast',
        apiBaseUrl: 'http://echon-v2-api:8000',
        clientUi: 'plexon-quick-check-v1',
        clientSource: 'event_quick_check',
      })
    );
    expect(enqueueEchonResearchViaMcp).not.toHaveBeenCalled();
  });

  it('prefers MCP over direct API when both are configured (same as agent chat)', async () => {
    vi.mocked(isEchonMcpResearchAvailable).mockReturnValue(true);
    vi.mocked(enqueueEchonResearchViaMcp).mockResolvedValue({
      ok: true,
      threadId: 'thread-mcp',
      runId: 'run-mcp',
    });

    const started = await startEchonQuickCheckResearch('Acme', 'https://acme.de');
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.handle.pollViaMcp).toBe(true);
    expect(enqueueEchonResearchViaMcp).toHaveBeenCalled();
    expect(enqueueEchonResearchRun).not.toHaveBeenCalled();
  });

  it('falls back to API when MCP fails but ECHON_API_URL is set', async () => {
    vi.mocked(isEchonMcpResearchAvailable).mockReturnValue(true);
    vi.mocked(enqueueEchonResearchViaMcp).mockResolvedValue({
      ok: false,
      reason: 'echon_mcp_error',
      detail: 'timeout',
    });
    vi.mocked(enqueueEchonResearchRun).mockResolvedValue({
      ok: true,
      threadId: 'thread-api',
      runId: 'run-api',
    });

    const started = await startEchonQuickCheckResearch('Acme', 'https://acme.de');
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.handle.threadId).toBe('thread-api');
    expect(started.handle.pollViaMcp).toBe(false);
    expect(enqueueEchonResearchRun).toHaveBeenCalled();
  });

  it('falls back to public API when internal MCP and Docker DNS fail', async () => {
    vi.mocked(isEchonMcpResearchAvailable).mockReturnValue(true);
    vi.mocked(enqueueEchonResearchViaMcp).mockResolvedValue({
      ok: false,
      reason: 'echon_mcp_error',
      detail: 'fetch failed; cause: getaddrinfo ENOTFOUND echon-mcp',
    });
    vi.mocked(enqueueEchonResearchRun)
      .mockResolvedValueOnce({
        ok: false,
        reason: 'echon_fetch_failed',
        detail: 'fetch failed; cause: getaddrinfo ENOTFOUND echon-v2-api',
      })
      .mockResolvedValueOnce({
        ok: true,
        threadId: 'thread-pub',
        runId: 'run-pub',
      });

    const started = await startEchonQuickCheckResearch('Acme', 'https://acme.de');
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.handle.threadId).toBe('thread-pub');
    expect(started.handle.apiBaseUrl).toBe('https://echon.projects-a.plygrnd.tech/echon');
    expect(enqueueEchonResearchRun).toHaveBeenCalledTimes(2);
  });

  it('returns clear message when all enqueue paths fail', async () => {
    delete process.env.ECHON_API_URL;
    vi.mocked(isEchonMcpResearchAvailable).mockReturnValue(false);
    vi.mocked(enqueueEchonResearchRun).mockResolvedValue({
      ok: false,
      reason: 'echon_fetch_failed',
      detail: 'fetch failed',
    });

    const started = await startEchonQuickCheckResearch('Acme', 'https://acme.de');
    expect(started.ok).toBe(false);
    if (started.ok) return;
    expect(started.userMessage).toContain('ECHON');
  });

  it('finalizeEchonQuickCheckResearch returns market context when available', async () => {
    vi.mocked(fetchEchonMarketContext).mockResolvedValue({
      available: true,
      threadId: 'thread-1',
      executiveSummary: 'Trends rising',
      keyFindings: ['Finding A'],
    });

    const result = await finalizeEchonQuickCheckResearch(
      {
        query: 'q',
        threadId: 'thread-1',
        runId: 'run-1',
        startedAt: Date.now(),
        apiBaseUrl: 'http://echon-v2-api:8000',
      },
      { maxWaitMs: 1000, onPoll: vi.fn() }
    );

    expect(result.available).toBe(true);
    expect(result.executiveSummary).toBe('Trends rising');
    expect(fetchEchonMarketContext).toHaveBeenCalledWith(
      'thread-1',
      expect.any(Number),
      'http://echon-v2-api:8000'
    );
  });

  it('isEchonQuickCheckResearchEnabled when MCP, env API, or public fallback exists', () => {
    expect(isEchonQuickCheckResearchEnabled()).toBe(true);
    delete process.env.ECHON_API_URL;
    vi.mocked(isEchonMcpResearchAvailable).mockReturnValue(false);
    expect(isEchonQuickCheckResearchEnabled()).toBe(true);
    vi.mocked(isEchonMcpResearchAvailable).mockReturnValue(true);
    expect(isEchonQuickCheckResearchEnabled()).toBe(true);
    expect(echonQuickCheckMissingEnvMessage()).toContain('Docker');
  });

  it('formatEchonEnqueueUserMessage maps DNS errors', () => {
    expect(
      formatEchonEnqueueUserMessage(
        'echon_mcp_error',
        'fetch failed; cause: getaddrinfo ENOTFOUND echon-mcp'
      )
    ).toContain('echon-mcp');
  });

  it('formatEchonEnqueueUserMessage maps 503', () => {
    expect(formatEchonEnqueueUserMessage('echon_http_503')).toContain('Kapazität');
  });
});
