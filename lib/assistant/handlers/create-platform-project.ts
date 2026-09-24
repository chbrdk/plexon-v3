import { randomUUID } from 'crypto';
import { createAssistantWorkflowRun, updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { createPlatformProjectWorkflow } from '@/lib/assistant/workflows/create-platform-project';
import { ensurePlatformProductBindings } from '@/lib/assistant/workflows/ensure-platform-product-bindings';
import { provisionAudionDirect } from '@/lib/assistant/workflows/provision-audion-direct';
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
  type AssistantHandlerResult,
  type IntentHandler,
} from '@/lib/assistant/handlers/context';
import { pathPlatformProjectDashboard } from '@/lib/constants';

/**
 * When the conversation already has a Collection, resolve/heal Audion instead of minting
 * a second platform project. Spec: knowledge/audion-binding-heal.md
 */
async function resolveExistingCollectionInsteadOfCreate(ctx: {
  user: { id: string };
  platformProjectId?: string;
  bindingIds: { checkionProjectId: string | null; audionProjectId: string | null } | null;
}): Promise<AssistantHandlerResult | null> {
  const platformProjectId = ctx.platformProjectId?.trim();
  if (!platformProjectId) return null;

  const ensured = await ensurePlatformProductBindings(platformProjectId, {
    source: 'assistant-resolve-before-create',
    plexonUserId: ctx.user.id,
    required: ['audion', 'checkion'],
  });

  let audionProjectId = ensured.audionProjectId;
  if (!audionProjectId) {
    const direct = await provisionAudionDirect({
      projectName: `Collection ${platformProjectId.slice(0, 8)}`,
      platformProjectId,
      source: 'assistant-resolve-before-create-direct',
      plexonUserId: ctx.user.id,
    });
    if (direct.ok) audionProjectId = direct.audionProjectId;
  }

  if (!audionProjectId && !ensured.checkionProjectId && !ctx.bindingIds?.audionProjectId) {
    return null;
  }

  const resolvedAudion = audionProjectId || ctx.bindingIds?.audionProjectId || null;
  const resolvedCheckion =
    ensured.checkionProjectId || ctx.bindingIds?.checkionProjectId || null;
  const dashboardPath = pathPlatformProjectDashboard(platformProjectId);

  const lines = [
    '## Collection bereits vorhanden',
    '',
    'Dieses Gespräch ist an eine bestehende Collection gebunden — es wurde **kein neues** Projekt angelegt.',
    '',
    `- **Collection:** \`${platformProjectId}\``,
    resolvedAudion ? `- **AUDION:** \`${resolvedAudion}\`` : '- **AUDION:** Binding noch offen (Sync/Heal läuft nach)',
    resolvedCheckion ? `- **CHECKION:** \`${resolvedCheckion}\`` : null,
    '',
    `[Collection öffnen](${dashboardPath})`,
    '',
    'Wenn du wirklich eine **neue** Collection willst, starte einen neuen Chat ohne Projektkontext.',
  ].filter((l): l is string => l != null);

  return {
    assistantText: lines.join('\n'),
    metadata: {
      contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN,
      platformProjectId,
      audionProjectId: resolvedAudion,
      checkionProjectId: resolvedCheckion,
      resolvedExisting: true,
    },
  };
}

export const handleCreateProjectIntent: IntentHandler<'create_project'> = async (ctx, intent) => {
  const resolved = await resolveExistingCollectionInsteadOfCreate(ctx);
  if (resolved) {
    emitPhase(ctx.emit, 'workflow', 'resolve_existing_platform_project');
    await recordAssistantUsageEvent({
      userId: ctx.user.id,
      eventType: 'workflow_run',
      rawUnits: { workflow: 'resolve_existing_platform_project' },
    });
    return resolved;
  }

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
