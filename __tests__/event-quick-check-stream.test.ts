import { describe, expect, it, vi } from 'vitest';
import { EVENT_QUICK_CHECK_INITIAL_STEPS } from '@/lib/assistant/ui-blocks/event-quick-check-steps';

vi.mock('@/lib/db/assistant-workflow-runs', () => ({
  updateAssistantWorkflowRun: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/assistant/workflows/create-platform-project', () => ({
  createPlatformProjectWorkflow: vi.fn(),
  getProjectBindingIds: vi.fn().mockResolvedValue({ checkionProjectId: null, audionProjectId: null }),
}));

vi.mock('@/lib/assistant/workflows/ensure-platform-product-bindings', () => ({
  ensurePlatformProductBindings: vi.fn(),
}));

vi.mock('@/lib/assistant/workflows/domain-scan', () => ({
  runDomainScanWorkflow: vi.fn().mockResolvedValue({
    ok: true,
    scanId: 'scan-1',
    scan: { id: 'scan-1', totalPages: 10, score: 80 },
  }),
}));

vi.mock('@/lib/assistant/workflows/geo-analysis', () => ({
  runGeoAnalysisWorkflow: vi.fn().mockResolvedValue({
    ok: true,
    jobId: 'geo-1',
    job: { jobId: 'geo-1', url: 'https://example.com', status: 'complete', overallScore: 70 },
  }),
}));

vi.mock('@/lib/integrations/checkion-research-client', () => ({
  startCheckionProjectResearch: vi.fn(),
}));

vi.mock('@/lib/integrations/audion-research-client', () => ({
  startAudionProjectResearch: vi.fn(),
  pollAudionProjectResearch: vi.fn(),
  fetchAudionProjectResearchLatest: vi.fn(),
}));

vi.mock('@/lib/integrations/checkion-geo-client', () => ({
  suggestCheckionGeoQueries: vi.fn().mockResolvedValue({
    ok: true,
    queries: ['Q1', 'Q2', 'Q3'],
    competitors: ['rival.com'],
  }),
}));

vi.mock('@/lib/integrations/audion-persona-bootstrap-client', () => ({
  runPersonaBootstrap: vi.fn().mockResolvedValue({
    ok: true,
    preview: {
      projectId: 'a1',
      projectName: 'Acme',
      targetGroupId: 'tg1',
      targetGroupName: 'Acme',
      persona: { id: 'p1', name: 'Anna', segment: 'B2B', confidence: 0.9, headline: 'H' },
    },
  }),
}));

vi.mock('@/lib/assistant/event-quick-check/echon-quick-check-research', () => ({
  isEchonQuickCheckResearchEnabled: vi.fn().mockReturnValue(false),
  echonQuickCheckMissingEnvMessage: vi.fn().mockReturnValue('ECHON_API_URL fehlt'),
  startEchonQuickCheckResearch: vi.fn(),
  finalizeEchonQuickCheckResearch: vi.fn(),
}));

import { runEventQuickCheck } from '@/lib/assistant/playbooks/run-event-quick-check';
import { createPlatformProjectWorkflow } from '@/lib/assistant/workflows/create-platform-project';
import { ensurePlatformProductBindings } from '@/lib/assistant/workflows/ensure-platform-product-bindings';
import { runDomainScanWorkflow } from '@/lib/assistant/workflows/domain-scan';

describe('runEventQuickCheck stream', () => {
  it('emits workflow phase and step_list updates during run', async () => {
    vi.mocked(createPlatformProjectWorkflow).mockResolvedValue({
      result: { ok: true, platformProjectId: 'pp-1', dashboardPath: '/p/pp-1' },
      steps: [],
    });
    vi.mocked(ensurePlatformProductBindings).mockResolvedValue({
      checkionProjectId: 'c1',
      audionProjectId: null,
      syncResults: [],
      missingRequired: ['audion'],
      domainPatched: false,
    });
    vi.mocked(runDomainScanWorkflow).mockImplementation(async (_input, options) => {
      await options?.onExternalProgress?.('crawling', 42);
      return { ok: true, scanId: 'scan-1', scan: { id: 'scan-1' } as never };
    });

    const emit = vi.fn();
    await runEventQuickCheck(
      { user: { id: 'u1' } as never, projectName: 'Acme', url: 'https://example.com' },
      { workflowRunId: 'run-1', initialSteps: [...EVENT_QUICK_CHECK_INITIAL_STEPS], emit }
    );

    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'phase', phase: 'workflow', detail: expect.stringContaining('Domain-Scan') })
    );
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ui_block_update',
        block: expect.objectContaining({ type: 'step_list' }),
      })
    );
  });
});
