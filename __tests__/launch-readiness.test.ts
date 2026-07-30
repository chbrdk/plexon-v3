import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/assistant-workflow-runs', () => ({
  updateAssistantWorkflowRun: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/assistant/workflows/create-platform-project', () => ({
  createPlatformProjectWorkflow: vi.fn(),
  getProjectBindingIds: vi.fn(),
}));

vi.mock('@/lib/integrations/checkion-connectivity', () => ({
  probeCheckionApiHealth: vi.fn(),
}));

vi.mock('@/lib/integrations/audion-connectivity', () => ({
  probeAudionApiHealth: vi.fn(),
}));

vi.mock('@/lib/platform-project-sync-service', () => ({
  syncPlatformProjectToProducts: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/integrations/checkion-research-client', () => ({
  startCheckionProjectResearch: vi.fn(),
}));

vi.mock('@/lib/integrations/audion-research-client', () => ({
  startAudionProjectResearch: vi.fn(),
  pollAudionProjectResearch: vi.fn(),
  fetchAudionProjectResearchLatest: vi.fn(),
}));

vi.mock('@/lib/assistant/playbooks/execute-step', () => ({
  executePlaybookStep: vi.fn(),
}));

vi.mock('@/lib/integrations/audion-persona-bootstrap-client', () => ({
  runPersonaBootstrap: vi.fn(),
}));

vi.mock('@/lib/assistant/workflows/summarize-project', () => ({
  summarizeProjectWorkflow: vi.fn(),
}));

import { runLaunchReadiness } from '@/lib/assistant/playbooks/run-launch-readiness';
import { createPlatformProjectWorkflow, getProjectBindingIds } from '@/lib/assistant/workflows/create-platform-project';
import { probeCheckionApiHealth } from '@/lib/integrations/checkion-connectivity';
import { probeAudionApiHealth } from '@/lib/integrations/audion-connectivity';
import { startCheckionProjectResearch } from '@/lib/integrations/checkion-research-client';
import { startAudionProjectResearch, pollAudionProjectResearch, fetchAudionProjectResearchLatest } from '@/lib/integrations/audion-research-client';
import { executePlaybookStep } from '@/lib/assistant/playbooks/execute-step';
import { runPersonaBootstrap } from '@/lib/integrations/audion-persona-bootstrap-client';
import { summarizeProjectWorkflow } from '@/lib/assistant/workflows/summarize-project';

const user = { id: 'user-1', role: 'user' as const, email: 'u@test.com' };

describe('runLaunchReadiness', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses existing platform project and runs audit steps', async () => {
    vi.mocked(getProjectBindingIds).mockResolvedValue({
      checkionProjectId: 'chk-1',
      audionProjectId: 'aud-1',
    });
    vi.mocked(probeCheckionApiHealth).mockResolvedValue({ ok: true, status: 200 });
    vi.mocked(probeAudionApiHealth).mockResolvedValue({ ok: true, status: 200 });
    vi.mocked(startCheckionProjectResearch).mockResolvedValue({ ok: true, data: { started: true } });
    vi.mocked(startAudionProjectResearch).mockResolvedValue({ ok: true, runId: 'run-1' });
    vi.mocked(pollAudionProjectResearch).mockResolvedValue({ ok: true, status: 'completed', progress: 100 });
    vi.mocked(fetchAudionProjectResearchLatest).mockResolvedValue({ summary: { done: true } });
    vi.mocked(executePlaybookStep).mockImplementation(async (kind) => {
      if (kind === 'pagespeed_check') {
        return {
          ok: true,
          payload: {
            kind: 'pagespeed_check',
            data: {
              url: 'https://example.com',
              performance: 88,
              accessibility: 91,
              bestPractices: 80,
              seo: 85,
            },
          },
        };
      }
      if (kind === 'quick_scan') {
        return {
          ok: true,
          payload: {
            kind: 'quick_scan',
            data: {
              id: 'scan-1',
              url: 'https://example.com',
              score: 76,
              stats: { errors: 0, warnings: 1, notices: 0, total: 1 },
              issues: [],
            },
          },
        };
      }
      return { ok: false, error: 'ssl down' };
    });
    vi.mocked(runPersonaBootstrap).mockResolvedValue({
      ok: true,
      preview: { projectId: 'aud-1', projectName: 'Acme', targetGroupId: 'tg-1', targetGroupName: 'Acme' },
    });
    vi.mocked(summarizeProjectWorkflow).mockResolvedValue({
      ok: true,
      text: '## Acme',
      data: {},
    });

    const result = await runLaunchReadiness({
      user,
      projectName: 'Acme',
      url: 'https://example.com',
      platformProjectId: 'pp-existing',
    });

    expect(createPlatformProjectWorkflow).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    expect(result.platformProjectId).toBe('pp-existing');
    expect(result.outcomes.find((o) => o.stepId === 'create_project')?.status).toBe('skipped');
    expect(result.outcomes.filter((o) => o.status === 'done').length).toBeGreaterThan(3);
  });

  it('fails when URL is missing', async () => {
    const result = await runLaunchReadiness({
      user,
      projectName: 'Acme',
      url: '',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('URL fehlt');
  });
});
