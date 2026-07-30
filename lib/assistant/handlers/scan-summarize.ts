import { randomUUID } from 'crypto';
import { extractScanIdFromHistory } from '@/lib/assistant/conversation-context';
import { createAssistantWorkflowRun, updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { ASSISTANT_MESSAGE_CONTENT_TYPE } from '@/lib/assistant/capabilities-overview';
import { buildScanSummarizeLayout } from '@/lib/assistant/ui-blocks/build-scan-summary-ui';
import {
  metadataWithWorkflowSteps,
  SCAN_SUMMARIZE_INITIAL_STEPS,
} from '@/lib/assistant/ui-blocks/build-workflow-ui';
import { runScanSummarizeWorkflow } from '@/lib/assistant/workflows/scan-summarize';
import { recordAssistantUsageEvent } from '@/lib/assistant/usage';
import {
  emitPhase,
  metadataWithStepList,
  type IntentHandler,
} from '@/lib/assistant/handlers/context';

export const handleScanSummarizeIntent: IntentHandler<'scan_summarize'> = async (ctx, intent) => {
  emitPhase(ctx.emit, 'workflow', 'scan_summarize');
  const scanId = intent.scanId ?? extractScanIdFromHistory(ctx.history, ctx.prompt);
  if (!scanId) {
    return {
      assistantText:
        '## Scan-Zusammenfassung\n\nBitte zuerst einen Scan ausführen oder die Scan-ID angeben (z. B. aus dem letzten Scan-Ergebnis).',
      metadata: { contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN },
    };
  }

  const workflowRun = await createAssistantWorkflowRun({
    id: randomUUID(),
    conversationId: ctx.conversationId,
    userId: ctx.user.id,
    type: 'scan_summarize',
    steps: SCAN_SUMMARIZE_INITIAL_STEPS,
  });
  const workflowRunId = workflowRun.id;
  const result = await runScanSummarizeWorkflow(
    { scanId },
    { workflowRunId, initialSteps: workflowRun.steps }
  );
  const steps = result.steps;
  let assistantText: string;
  let metadata: Record<string, unknown> | undefined;

  if (result.ok && result.data) {
    const layout = buildScanSummarizeLayout(result.data);
    assistantText = `## Scan-Zusammenfassung\n\nScan \`${scanId}\` — ${result.data.overallGrade ?? 'Analyse'}`;
    metadata = metadataWithWorkflowSteps(
      {
        contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED,
        workflowRunId,
        workflowType: 'scan_summarize',
        uiLayout: layout,
      },
      steps,
      'Scan-Zusammenfassung'
    );
  } else {
    assistantText = `## Scan-Zusammenfassung fehlgeschlagen\n\n${result.error ?? 'Unbekannter Fehler'}`;
    metadata = metadataWithStepList(
      { contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN, workflowRunId, workflowType: 'scan_summarize' },
      steps,
      'Scan-Zusammenfassung'
    );
  }
  await updateAssistantWorkflowRun(workflowRunId, { status: result.ok ? 'completed' : 'failed', steps });
  await recordAssistantUsageEvent({ userId: ctx.user.id, eventType: 'workflow_run', rawUnits: { workflow: 'scan_summarize' } });
  return { assistantText, metadata, workflowRunId };
};
