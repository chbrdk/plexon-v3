import { describe, expect, it, vi } from 'vitest';
import type { AssistantHandlerContext } from '@/lib/assistant/handlers/context';
import { handleScanSummarizeIntent } from '@/lib/assistant/handlers/scan-summarize';
import { handleStartResearchIntent } from '@/lib/assistant/handlers/start-research';
import { handleProjectStatusIntent } from '@/lib/assistant/handlers/project-status';
import { handleRunPlaybookIntent } from '@/lib/assistant/handlers/run-playbook';
import { handleQuickScanIntent } from '@/lib/assistant/handlers/quick-scan';
import { handleDomainScanIntent } from '@/lib/assistant/handlers/domain-scan';
import { handlePagespeedCheckIntent } from '@/lib/assistant/handlers/pagespeed-check';
import { handleContrastCheckIntent } from '@/lib/assistant/handlers/contrast-check';
import { handleReadabilityCheckIntent } from '@/lib/assistant/handlers/readability-check';
import { handleSslCheckIntent } from '@/lib/assistant/handlers/ssl-check';
import { handleWaybackCheckIntent } from '@/lib/assistant/handlers/wayback-check';
import { handleSyncDiagnoseIntent } from '@/lib/assistant/handlers/sync-diagnose';
import { handlePersonaBootstrapIntent } from '@/lib/assistant/handlers/persona-bootstrap';
import { handleGeoAnalysisIntent } from '@/lib/assistant/handlers/geo-analysis';

vi.mock('@/lib/assistant/assistant-agent', () => ({
  runAssistantAgent: vi.fn(),
}));
vi.mock('@/lib/db/product-entitlements', () => ({
  getUserProductEntitlementsMap: vi.fn().mockResolvedValue({}),
}));
vi.mock('@/lib/assistant/user-eligibility', () => ({
  listUserCompanies: vi.fn().mockResolvedValue([]),
}));

function baseCtx(overrides: Partial<AssistantHandlerContext> = {}): AssistantHandlerContext {
  return {
    user: { id: 'user-1', role: 'user', email: 'u@test.com' },
    body: {},
    conversationId: 'conv-1',
    conversation: { id: 'conv-1', userId: 'user-1', platformProjectId: null, title: 'Test' },
    platformProjectId: undefined,
    bindingIds: null,
    history: [],
    prompt: 'test prompt',
    profile: { name: 'Test User', email: 'u@test.com' },
    resolvedName: (name) => name?.trim() || undefined,
    resolvedDomain: (domain) => domain?.trim() || undefined,
    ...overrides,
  };
}

describe('assistant intent handlers', () => {
  it('exports all extracted handlers', async () => {
    const { handleFreeChatIntent } = await import('@/lib/assistant/handlers/free-chat');
    expect(typeof handleQuickScanIntent).toBe('function');
    expect(typeof handleDomainScanIntent).toBe('function');
    expect(typeof handlePagespeedCheckIntent).toBe('function');
    expect(typeof handleContrastCheckIntent).toBe('function');
    expect(typeof handleReadabilityCheckIntent).toBe('function');
    expect(typeof handleScanSummarizeIntent).toBe('function');
    expect(typeof handleSslCheckIntent).toBe('function');
    expect(typeof handleWaybackCheckIntent).toBe('function');
    expect(typeof handleSyncDiagnoseIntent).toBe('function');
    expect(typeof handlePersonaBootstrapIntent).toBe('function');
    expect(typeof handleGeoAnalysisIntent).toBe('function');
    expect(typeof handleStartResearchIntent).toBe('function');
    expect(typeof handleProjectStatusIntent).toBe('function');
    expect(typeof handleFreeChatIntent).toBe('function');
    expect(typeof handleRunPlaybookIntent).toBe('function');
  });

  it('handleScanSummarizeIntent prompts for scan id when missing', async () => {
    const result = await handleScanSummarizeIntent(baseCtx(), { type: 'scan_summarize' });
    expect(result.assistantText).toContain('Scan-Zusammenfassung');
    expect(result.assistantText).toContain('Scan-ID');
    expect(result.workflowRunId).toBeUndefined();
  });

  it('handleStartResearchIntent prompts for project when missing', async () => {
    const result = await handleStartResearchIntent(baseCtx(), { type: 'start_research' });
    expect(result.assistantText).toContain('Projekt auswählen');
    expect(result.workflowRunId).toBeUndefined();
  });

  it('handleProjectStatusIntent prompts for project when missing', async () => {
    const result = await handleProjectStatusIntent(baseCtx(), { type: 'project_status' });
    expect(result.assistantText).toContain('Projekt auswählen');
  });

  it('handleRunPlaybookIntent returns error for unknown playbook', async () => {
    const result = await handleRunPlaybookIntent(baseCtx(), {
      type: 'run_playbook',
      playbookId: 'nonexistent_playbook_xyz',
      url: 'https://example.com',
    });
    expect(result.assistantText).toContain('Playbook unbekannt');
    expect(result.workflowRunId).toBeUndefined();
  });

  it('handleFreeChatIntent throws when ANTHROPIC_API_KEY is missing', async () => {
    const { handleFreeChatIntent } = await import('@/lib/assistant/handlers/free-chat');
    const prev = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      await expect(handleFreeChatIntent(baseCtx(), { type: 'free_chat' })).rejects.toMatchObject({
        message: 'ANTHROPIC_API_KEY not configured',
        status: 503,
      });
    } finally {
      if (prev !== undefined) process.env.ANTHROPIC_API_KEY = prev;
    }
  });
});
