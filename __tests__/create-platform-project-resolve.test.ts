import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleCreateProjectIntent } from '@/lib/assistant/handlers/create-platform-project';
import type { AssistantHandlerContext } from '@/lib/assistant/handlers/context';

vi.mock('@/lib/assistant/workflows/ensure-platform-product-bindings', () => ({
  ensurePlatformProductBindings: vi.fn(),
}));

vi.mock('@/lib/assistant/workflows/provision-audion-direct', () => ({
  provisionAudionDirect: vi.fn(),
}));

vi.mock('@/lib/assistant/workflows/create-platform-project', () => ({
  createPlatformProjectWorkflow: vi.fn(),
}));

vi.mock('@/lib/assistant/workflows/parallel-research', () => ({
  runParallelResearchWorkflow: vi.fn(),
}));

vi.mock('@/lib/db/assistant-workflow-runs', () => ({
  createAssistantWorkflowRun: vi.fn(async () => ({ id: 'run-1', steps: [] })),
  updateAssistantWorkflowRun: vi.fn(),
}));

vi.mock('@/lib/assistant/usage', () => ({
  recordAssistantUsageEvent: vi.fn(),
}));

vi.mock('@/lib/assistant/ui-blocks/build-platform-created-ui', () => ({
  buildPlatformCreatedLayout: vi.fn(() => ({})),
  mergePlatformCreatedWithSteps: vi.fn((a) => a),
}));

vi.mock('@/lib/assistant/ui-blocks/build-workflow-ui', () => ({
  metadataWithWorkflowSteps: vi.fn((base) => base),
  PARALLEL_RESEARCH_INITIAL_STEPS: [],
}));

vi.mock('@/lib/assistant/format-messages', () => ({
  formatMissingCompanyMessage: vi.fn(() => 'missing company'),
  formatMissingProjectNameMessage: vi.fn(() => 'missing name'),
  formatProjectCreatedMessage: vi.fn(() => 'created'),
}));

import { ensurePlatformProductBindings } from '@/lib/assistant/workflows/ensure-platform-product-bindings';
import { provisionAudionDirect } from '@/lib/assistant/workflows/provision-audion-direct';
import { createPlatformProjectWorkflow } from '@/lib/assistant/workflows/create-platform-project';

function baseCtx(overrides: Partial<AssistantHandlerContext> = {}): AssistantHandlerContext {
  return {
    user: { id: 'user-1', email: 'u@example.com' } as never,
    body: {} as never,
    conversationId: 'conv-1',
    conversation: {
      id: 'conv-1',
      userId: 'user-1',
      platformProjectId: 'pp-existing',
      title: null,
    },
    prompt: 'neues projekt',
    history: [],
    profile: { name: null, email: 'u@example.com' },
    platformProjectId: 'pp-existing',
    bindingIds: { checkionProjectId: 'c1', audionProjectId: null },
    images: [],
    emit: vi.fn(),
    resolvedName: (n?: string) => n?.trim() || undefined,
    resolvedDomain: (d?: string | null) => d?.trim() || undefined,
    ...overrides,
  };
}

describe('handleCreateProjectIntent resolve-before-create', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves existing Collection via ensure/heal and skips create workflow', async () => {
    vi.mocked(ensurePlatformProductBindings).mockResolvedValue({
      checkionProjectId: 'c1',
      audionProjectId: 'aud-healed',
      syncResults: [],
      missingRequired: [],
      domainPatched: false,
      audionHealed: true,
    });

    const result = await handleCreateProjectIntent(baseCtx(), {
      type: 'create_project',
      name: 'Should Not Create',
      domain: null,
    } as never);

    expect(createPlatformProjectWorkflow).not.toHaveBeenCalled();
    expect(provisionAudionDirect).not.toHaveBeenCalled();
    expect(ensurePlatformProductBindings).toHaveBeenCalledWith('pp-existing', {
      source: 'assistant-resolve-before-create',
      plexonUserId: 'user-1',
      required: ['audion', 'checkion'],
    });
    expect(result.metadata?.resolvedExisting).toBe(true);
    expect(result.metadata?.audionProjectId).toBe('aud-healed');
    expect(result.assistantText).toMatch(/kein neues/i);
  });

  it('creates new Collection when conversation has no platformProjectId', async () => {
    vi.mocked(createPlatformProjectWorkflow).mockResolvedValue({
      result: {
        ok: true,
        platformProjectId: 'pp-new',
        checkionProjectId: 'c-new',
        audionProjectId: 'a-new',
        dashboardPath: '/projects/pp-new',
        syncResults: [],
      },
      steps: [],
    });

    await handleCreateProjectIntent(
      baseCtx({
        platformProjectId: undefined,
        bindingIds: null,
        conversation: {
          id: 'conv-1',
          userId: 'user-1',
          platformProjectId: null,
          title: null,
        },
      }),
      { type: 'create_project', name: 'Fresh', domain: 'example.com' } as never
    );

    expect(ensurePlatformProductBindings).not.toHaveBeenCalled();
    expect(createPlatformProjectWorkflow).toHaveBeenCalled();
  });
});
