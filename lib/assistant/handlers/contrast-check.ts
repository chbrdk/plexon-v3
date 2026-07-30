import { randomUUID } from 'crypto';
import { createAssistantWorkflowRun, updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { ASSISTANT_MESSAGE_CONTENT_TYPE } from '@/lib/assistant/capabilities-overview';
import { buildContrastCheckLayout } from '@/lib/assistant/ui-blocks/build-contrast-ui';
import {
  CONTRAST_CHECK_INITIAL_STEPS,
  metadataWithWorkflowSteps,
} from '@/lib/assistant/ui-blocks/build-workflow-ui';
import { runContrastCheckWorkflow } from '@/lib/assistant/workflows/contrast-check';
import { recordAssistantUsageEvent } from '@/lib/assistant/usage';
import {
  emitPhase,
  metadataWithStepList,
  type IntentHandler,
} from '@/lib/assistant/handlers/context';

export const handleContrastCheckIntent: IntentHandler<'contrast_check'> = async (ctx, intent) => {
  emitPhase(ctx.emit, 'workflow', 'contrast_check');
  const workflowRun = await createAssistantWorkflowRun({
    id: randomUUID(),
    conversationId: ctx.conversationId,
    userId: ctx.user.id,
    type: 'contrast_check',
    steps: CONTRAST_CHECK_INITIAL_STEPS,
  });
  const workflowRunId = workflowRun.id;
  const result = await runContrastCheckWorkflow(
    { foreground: intent.foreground, background: intent.background },
    { workflowRunId, initialSteps: workflowRun.steps }
  );
  const steps = result.steps;
  let assistantText: string;
  let metadata: Record<string, unknown> | undefined;

  if (result.ok && result.data) {
    const layout = buildContrastCheckLayout(result.data);
    assistantText = `## Kontrast-Check\n\n**#${result.data.foreground}** auf **#${result.data.background}** — Ratio **${result.data.ratio}**:1`;
    metadata = metadataWithWorkflowSteps(
      {
        contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED,
        workflowRunId,
        workflowType: 'contrast_check',
        uiLayout: layout,
      },
      steps,
      'Kontrast-Check'
    );
  } else {
    assistantText = `## Kontrast-Check fehlgeschlagen\n\n${result.error ?? 'Unbekannter Fehler'}`;
    metadata = metadataWithStepList(
      { contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN, workflowRunId, workflowType: 'contrast_check' },
      steps,
      'Kontrast-Check'
    );
  }
  await updateAssistantWorkflowRun(workflowRunId, { status: result.ok ? 'completed' : 'failed', steps });
  await recordAssistantUsageEvent({ userId: ctx.user.id, eventType: 'workflow_run', rawUnits: { workflow: 'contrast_check' } });
  return { assistantText, metadata, workflowRunId };
};
