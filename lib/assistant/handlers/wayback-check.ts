import { randomUUID } from 'crypto';
import { createAssistantWorkflowRun, updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { ASSISTANT_MESSAGE_CONTENT_TYPE } from '@/lib/assistant/capabilities-overview';
import { buildWaybackCheckLayout } from '@/lib/assistant/ui-blocks/build-wayback-ui';
import {
  metadataWithWorkflowSteps,
  WAYBACK_CHECK_INITIAL_STEPS,
} from '@/lib/assistant/ui-blocks/build-workflow-ui';
import { runWaybackCheckWorkflow } from '@/lib/assistant/workflows/wayback-check';
import { recordAssistantUsageEvent } from '@/lib/assistant/usage';
import {
  emitPhase,
  metadataWithStepList,
  type IntentHandler,
} from '@/lib/assistant/handlers/context';

export const handleWaybackCheckIntent: IntentHandler<'wayback_check'> = async (ctx, intent) => {
  emitPhase(ctx.emit, 'workflow', 'wayback_check');
  const workflowRun = await createAssistantWorkflowRun({
    id: randomUUID(),
    conversationId: ctx.conversationId,
    userId: ctx.user.id,
    type: 'wayback_check',
    steps: WAYBACK_CHECK_INITIAL_STEPS,
  });
  const workflowRunId = workflowRun.id;
  const result = await runWaybackCheckWorkflow(
    { url: intent.url },
    { workflowRunId, initialSteps: workflowRun.steps }
  );
  const steps = result.steps;
  let assistantText: string;
  let metadata: Record<string, unknown> | undefined;

  if (result.ok && result.data) {
    const layout = buildWaybackCheckLayout(result.data);
    assistantText = `## Wayback\n\n**${result.data.url}** — Archiviert: **${result.data.available ? 'Ja' : 'Nein'}**`;
    metadata = metadataWithWorkflowSteps(
      {
        contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED,
        workflowRunId,
        workflowType: 'wayback_check',
        uiLayout: layout,
      },
      steps,
      'Wayback'
    );
  } else {
    assistantText = `## Wayback fehlgeschlagen\n\n${result.error ?? 'Unbekannter Fehler'}`;
    metadata = metadataWithStepList(
      { contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN, workflowRunId, workflowType: 'wayback_check' },
      steps,
      'Wayback'
    );
  }
  await updateAssistantWorkflowRun(workflowRunId, { status: result.ok ? 'completed' : 'failed', steps });
  await recordAssistantUsageEvent({ userId: ctx.user.id, eventType: 'workflow_run', rawUnits: { workflow: 'wayback_check' } });
  return { assistantText, metadata, workflowRunId };
};
