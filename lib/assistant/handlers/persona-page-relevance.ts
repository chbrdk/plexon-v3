import { randomUUID } from 'crypto';
import { createAssistantWorkflowRun, updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import { ASSISTANT_MESSAGE_CONTENT_TYPE } from '@/lib/assistant/capabilities-overview';
import { buildPersonaPageRelevanceLayout } from '@/lib/assistant/ui-blocks/build-persona-page-relevance-ui';
import { metadataWithWorkflowSteps } from '@/lib/assistant/ui-blocks/build-workflow-ui';
import { runPersonaPageRelevance } from '@/lib/integrations/persona-page-relevance-client';
import { recordAssistantUsageEvent } from '@/lib/assistant/usage';
import {
  emitPhase,
  metadataWithStepList,
  type IntentHandler,
} from '@/lib/assistant/handlers/context';

const INITIAL_STEPS: WorkflowStep[] = [
  { id: 'persona', label: 'Persona auflösen', status: 'pending' },
  { id: 'domain_scan', label: 'Deep Scan finden', status: 'pending' },
  { id: 'pages', label: 'Corpus-Seiten laden', status: 'pending' },
  { id: 'rank', label: 'Relevanz ranken', status: 'pending' },
];

function markSteps(ok: boolean): WorkflowStep[] {
  if (!ok) {
    return INITIAL_STEPS.map((s, i) =>
      i === 0 ? { ...s, status: 'error' as const } : { ...s, status: 'pending' as const },
    );
  }
  return INITIAL_STEPS.map((s) => ({ ...s, status: 'done' as const }));
}

export const handlePersonaPageRelevanceIntent: IntentHandler<'persona_page_relevance'> = async (
  ctx,
  intent,
) => {
  emitPhase(ctx.emit, 'workflow', 'persona_page_relevance');
  const workflowRun = await createAssistantWorkflowRun({
    id: randomUUID(),
    conversationId: ctx.conversationId,
    userId: ctx.user.id,
    type: 'persona_page_relevance',
    steps: INITIAL_STEPS,
  });
  const workflowRunId = workflowRun.id;

  const result = await runPersonaPageRelevance({
    plexonUserId: ctx.user.id,
    userRole: ctx.user.role,
    platformProjectId: ctx.platformProjectId,
    checkionProjectId: ctx.bindingIds?.checkionProjectId,
    audionProjectId: ctx.bindingIds?.audionProjectId,
    personaId: intent.personaId,
    personaName: ctx.resolvedName(intent.personaName),
    domainScanId: intent.domainScanId,
    urlHint: intent.urlHint,
    prompt: ctx.prompt,
    topK: intent.topK,
  });

  const steps = markSteps(result.ok);
  let assistantText: string;
  let metadata: Record<string, unknown> | undefined;

  if (result.ok) {
    const { preview } = result;
    const layout = buildPersonaPageRelevanceLayout(preview);
    assistantText = `## Seiten-Relevanz\n\n**${preview.persona.name}** — ${preview.rankedPages.length} Seiten aus CHECKION mit Metriken und kurzer Begründung.`;
    metadata = metadataWithWorkflowSteps(
      {
        contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED,
        workflowRunId,
        workflowType: 'persona_page_relevance',
        uiLayout: layout,
        personaId: preview.persona.id,
        domainScanId: preview.domainScan.id,
      },
      steps,
      'Persona → Seiten',
    );
  } else {
    assistantText = `## Fehler\n\n${result.error}`;
    metadata = metadataWithStepList(
      {
        contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN,
        workflowRunId,
        workflowType: 'persona_page_relevance',
      },
      steps,
      'Persona → Seiten',
    );
  }

  await updateAssistantWorkflowRun(workflowRunId, {
    status: result.ok ? 'completed' : 'failed',
    steps,
  });
  await recordAssistantUsageEvent({
    userId: ctx.user.id,
    eventType: 'workflow_run',
    rawUnits: { workflow: 'persona_page_relevance' },
  });
  return { assistantText, metadata, workflowRunId };
};
