import { randomUUID } from 'crypto';
import { createAssistantWorkflowRun, updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { ASSISTANT_MESSAGE_CONTENT_TYPE } from '@/lib/assistant/capabilities-overview';
import { enrichWorkflowLayout } from '@/lib/assistant/insights/enrich-workflow-layout';
import { workflowEnrichmentMetadata } from '@/lib/assistant/insights/enrichment-metadata';
import { buildReadabilityCheckLayout } from '@/lib/assistant/ui-blocks/build-readability-ui';
import {
  metadataWithWorkflowSteps,
  READABILITY_CHECK_INITIAL_STEPS,
} from '@/lib/assistant/ui-blocks/build-workflow-ui';
import { runReadabilityCheckWorkflow } from '@/lib/assistant/workflows/readability-check';
import { recordAssistantUsageEvent } from '@/lib/assistant/usage';
import {
  emitPhase,
  metadataWithStepList,
  type IntentHandler,
} from '@/lib/assistant/handlers/context';

export const handleReadabilityCheckIntent: IntentHandler<'readability_check'> = async (ctx, intent) => {
  emitPhase(ctx.emit, 'workflow', 'readability_check');
  const workflowRun = await createAssistantWorkflowRun({
    id: randomUUID(),
    conversationId: ctx.conversationId,
    userId: ctx.user.id,
    type: 'readability_check',
    steps: READABILITY_CHECK_INITIAL_STEPS,
  });
  const workflowRunId = workflowRun.id;
  const result = await runReadabilityCheckWorkflow(
    { url: intent.url },
    { workflowRunId, initialSteps: workflowRun.steps }
  );
  const steps = result.steps;
  let assistantText: string;
  let metadata: Record<string, unknown> | undefined;

  if (result.ok && result.data) {
    const enriched = await enrichWorkflowLayout(
      ctx,
      { workflowType: 'readability_check', url: result.data.url, readability: result.data },
      buildReadabilityCheckLayout(result.data)
    );
    assistantText = `## Lesbarkeit\n\n**${result.data.url}** — Grade Level **${result.data.score}** (${result.data.grade})`;
    if (enriched.assistantInsightMarkdown) {
      assistantText += `\n\n${enriched.assistantInsightMarkdown}`;
    }
    metadata = metadataWithWorkflowSteps(
      {
        contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED,
        workflowRunId,
        workflowType: 'readability_check',
        uiLayout: enriched.layout,
        ...workflowEnrichmentMetadata(enriched),
      },
      steps,
      'Lesbarkeit'
    );
  } else {
    assistantText = `## Lesbarkeit fehlgeschlagen\n\n${result.error ?? 'Unbekannter Fehler'}`;
    metadata = metadataWithStepList(
      { contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN, workflowRunId, workflowType: 'readability_check' },
      steps,
      'Lesbarkeit'
    );
  }
  await updateAssistantWorkflowRun(workflowRunId, { status: result.ok ? 'completed' : 'failed', steps });
  await recordAssistantUsageEvent({ userId: ctx.user.id, eventType: 'workflow_run', rawUnits: { workflow: 'readability_check' } });
  return { assistantText, metadata, workflowRunId };
};
