import { randomUUID } from 'crypto';
import { createAssistantWorkflowRun, updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { ASSISTANT_MESSAGE_CONTENT_TYPE } from '@/lib/assistant/capabilities-overview';
import { fetchCheckionScanSummarize } from '@/lib/integrations/checkion-scan-summarize-client';
import { buildScanResultLayout } from '@/lib/assistant/ui-blocks/build-scan-result-ui';
import { appendScanSummarizeToLayout } from '@/lib/assistant/ui-blocks/build-scan-summary-ui';
import {
  metadataWithWorkflowSteps,
  QUICK_SCAN_INITIAL_STEPS,
  QUICK_SCAN_SUMMARIZE_STEP,
} from '@/lib/assistant/ui-blocks/build-workflow-ui';
import { runQuickScanWorkflow } from '@/lib/assistant/workflows/quick-scan';
import {
  emitWorkflowRunStarted,
  emitWorkflowStepsToStream,
  patchWorkflowSteps,
} from '@/lib/assistant/workflows/workflow-step-stream';
import { recordAssistantUsageEvent } from '@/lib/assistant/usage';
import { enrichWorkflowLayout } from '@/lib/assistant/insights/enrich-workflow-layout';
import { workflowEnrichmentMetadata } from '@/lib/assistant/insights/enrichment-metadata';
import {
  emitPhase,
  metadataWithStepList,
  type IntentHandler,
} from '@/lib/assistant/handlers/context';

export const handleQuickScanIntent: IntentHandler<'quick_scan'> = async (ctx, intent) => {
  emitPhase(ctx.emit, 'workflow', 'quick_scan');
  const stepListTitle = 'Accessibility-Scan';
  const initialSteps = intent.summarize
    ? [...QUICK_SCAN_INITIAL_STEPS, QUICK_SCAN_SUMMARIZE_STEP]
    : [...QUICK_SCAN_INITIAL_STEPS];
  const workflowRun = await createAssistantWorkflowRun({
    id: randomUUID(),
    conversationId: ctx.conversationId,
    userId: ctx.user.id,
    type: 'quick_scan',
    steps: initialSteps,
  });
  const workflowRunId = workflowRun.id;
  emitWorkflowRunStarted(ctx.emit, workflowRunId, 'quick_scan');
  emitWorkflowStepsToStream(ctx.emit, initialSteps, 'quick_scan', stepListTitle);

  const { ok, scan, error, steps: scanSteps } = await runQuickScanWorkflow(
    { url: intent.url, checkionProjectId: ctx.bindingIds?.checkionProjectId },
    {
      workflowRunId,
      initialSteps: workflowRun.steps,
      emit: ctx.emit,
      workflowType: 'quick_scan',
      stepListTitle,
    }
  );
  let steps = scanSteps;
  let layout = ok && scan ? buildScanResultLayout(scan) : undefined;
  let assistantOk = ok;
  let assistantText = '';

  if (ok && scan && intent.summarize) {
    steps = await patchWorkflowSteps({
      runId: workflowRunId,
      steps,
      stepId: 'summarize',
      patch: { status: 'running' },
      emit: ctx.emit,
      workflowType: 'quick_scan',
      title: stepListTitle,
    });
    const sum = await fetchCheckionScanSummarize(scan.id);
    if (sum.ok && sum.data && layout) {
      steps = await patchWorkflowSteps({
        runId: workflowRunId,
        steps,
        stepId: 'summarize',
        patch: { status: 'done' },
        emit: ctx.emit,
        workflowType: 'quick_scan',
        title: stepListTitle,
      });
      layout = appendScanSummarizeToLayout(layout, sum.data);
      assistantText = `## Scan + Zusammenfassung\n\n**${scan.url}** — Score **${scan.score}**/100`;
    } else {
      const sumError = !sum.ok ? sum.error : 'Unbekannter Fehler';
      steps = await patchWorkflowSteps({
        runId: workflowRunId,
        steps,
        stepId: 'summarize',
        patch: { status: 'error', detail: sumError },
        emit: ctx.emit,
        workflowType: 'quick_scan',
        title: stepListTitle,
      });
      assistantText = `## Scan abgeschlossen (Summary fehlgeschlagen)\n\n**${scan.url}** — Score **${scan.score}**/100\n\n${sumError}`;
    }
  } else if (ok && scan) {
    assistantText = `## Scan abgeschlossen\n\n**${scan.url}** — Score **${scan.score}**/100`;
  } else {
    assistantText = `## Scan fehlgeschlagen\n\n${error ?? 'Unbekannter Fehler'}`;
    assistantOk = false;
  }

  let enrichmentExtras: Record<string, unknown> = {};
  if (ok && scan && layout) {
    const enriched = await enrichWorkflowLayout(
      ctx,
      { workflowType: 'quick_scan', url: scan.url, scan },
      layout
    );
    layout = enriched.layout;
    enrichmentExtras = workflowEnrichmentMetadata(enriched);
    if (enriched.assistantInsightMarkdown) {
      assistantText += `\n\n${enriched.assistantInsightMarkdown}`;
    }
  }

  await updateAssistantWorkflowRun(workflowRunId, { status: assistantOk ? 'completed' : 'failed', steps });
  let metadata: Record<string, unknown> | undefined;
  if (layout) {
    metadata = metadataWithWorkflowSteps(
      {
        contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED,
        workflowRunId,
        workflowType: 'quick_scan',
        uiLayout: layout,
        ...enrichmentExtras,
      },
      steps,
      stepListTitle
    );
  } else {
    metadata = metadataWithStepList(
      { contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN, workflowRunId, workflowType: 'quick_scan' },
      steps,
      stepListTitle
    );
  }
  await recordAssistantUsageEvent({ userId: ctx.user.id, eventType: 'workflow_run', rawUnits: { workflow: 'quick_scan' } });
  return { assistantText, metadata, workflowRunId };
};
