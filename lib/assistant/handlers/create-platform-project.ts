import { randomUUID } from 'crypto';
import { createAssistantWorkflowRun, updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { createPlatformProjectWorkflow } from '@/lib/assistant/workflows/create-platform-project';
import { runParallelResearchWorkflow } from '@/lib/assistant/workflows/parallel-research';
import { recordAssistantUsageEvent } from '@/lib/assistant/usage';
import {
  buildPlatformCreatedLayout,
  mergePlatformCreatedWithSteps,
} from '@/lib/assistant/ui-blocks/build-platform-created-ui';
import {
  metadataWithWorkflowSteps,
  PARALLEL_RESEARCH_INITIAL_STEPS,
} from '@/lib/assistant/ui-blocks/build-workflow-ui';
import { ASSISTANT_MESSAGE_CONTENT_TYPE } from '@/lib/assistant/capabilities-overview';
import {
  formatMissingCompanyMessage,
  formatMissingProjectNameMessage,
  formatProjectCreatedMessage,
} from '@/lib/assistant/format-messages';
import {
  emitPhase,
  metadataWithStepList,
  type AssistantHandlerContext,
  type AssistantHandlerResult,
  type IntentHandler,
} from '@/lib/assistant/handlers/context';

export const handleCreateProjectIntent: IntentHandler<'create_project'> = async (ctx, intent) => {
  emitPhase(ctx.emit, 'workflow', 'create_platform_project');
  const workflowRun = await createAssistantWorkflowRun({
    id: randomUUID(),
    conversationId: ctx.conversationId,
    userId: ctx.user.id,
    type: 'create_platform_project',
  });

  const { result, steps } = await createPlatformProjectWorkflow(
    ctx.user,
    {
      name: ctx.resolvedName(intent.name) ?? '',
      domain: ctx.resolvedDomain(intent.domain) ?? null,
      syncProducts: true,
    },
    { workflowRunId: workflowRun.id, initialSteps: workflowRun.steps }
  );

  let assistantText = '';
  let metadata: Record<string, unknown> | undefined;
  let workflowRunId = workflowRun.id;
  let conversationPatch: AssistantHandlerResult['conversationPatch'];

  if (!result.ok && result.missing?.includes('name')) {
    assistantText = formatMissingProjectNameMessage(intent.domain);
    metadata = { contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN };
  } else if (!result.ok && result.missing?.includes('companyId') && result.companyOptions?.length) {
    assistantText = formatMissingCompanyMessage(result.companyOptions);
    metadata = { contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN };
  } else if (result.ok && result.platformProjectId) {
    if (intent.startResearch) {
      const researchRun = await createAssistantWorkflowRun({
        id: randomUUID(),
        conversationId: ctx.conversationId,
        userId: ctx.user.id,
        type: 'parallel_research',
        steps: PARALLEL_RESEARCH_INITIAL_STEPS,
      });
      workflowRunId = researchRun.id;
      void runParallelResearchWorkflow({
        runId: researchRun.id,
        user: ctx.user,
        platformProjectId: result.platformProjectId,
        domain: intent.domain ?? null,
      }).catch((e) => {
        console.error('[assistant] parallel research failed', e);
      });
    }

    assistantText = formatProjectCreatedMessage({
      name: intent.name || 'Neues Projekt',
      platformProjectId: result.platformProjectId,
      dashboardPath: result.dashboardPath,
      syncResults: result.syncResults,
      startResearch: Boolean(intent.startResearch),
    });
    const platformLayout = buildPlatformCreatedLayout(
      { ...result, ok: true, platformProjectId: result.platformProjectId },
      intent.name || 'Neues Projekt'
    );
    const stepMeta = metadataWithWorkflowSteps(
      {
        contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED,
        workflowSteps: steps,
        workflowRunId,
        workflowType: 'create_platform_project',
      },
      steps,
      'Projekt anlegen'
    );
    metadata = {
      ...stepMeta,
      uiLayout: mergePlatformCreatedWithSteps(
        stepMeta.uiLayout as import('@/lib/assistant/ui-blocks/types').UiLayout | undefined,
        platformLayout
      ),
    };
    conversationPatch = {
      platformProjectId: result.platformProjectId,
      title: intent.name ?? ctx.conversation.title ?? undefined,
    };
  } else {
    assistantText = `## Fehler\n\n${result.error ?? 'Projektanlage fehlgeschlagen.'}`;
    metadata = metadataWithStepList(
      {
        contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN,
        workflowSteps: steps,
        workflowRunId,
        workflowType: 'create_platform_project',
      },
      steps,
      'Projekt anlegen'
    );
  }

  await recordAssistantUsageEvent({
    userId: ctx.user.id,
    eventType: 'workflow_run',
    rawUnits: { workflow: 'create_platform_project' },
  });

  return { assistantText, metadata, workflowRunId, conversationPatch };
};
