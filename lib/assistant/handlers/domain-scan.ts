import { randomUUID } from 'crypto';
import { createAssistantWorkflowRun, updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { ASSISTANT_MESSAGE_CONTENT_TYPE } from '@/lib/assistant/capabilities-overview';
import { enrichWorkflowLayout } from '@/lib/assistant/insights/enrich-workflow-layout';
import { workflowEnrichmentMetadata } from '@/lib/assistant/insights/enrichment-metadata';
import { buildDomainScanLayout } from '@/lib/assistant/ui-blocks/build-domain-scan-ui';
import {
  DOMAIN_SCAN_INITIAL_STEPS,
  metadataWithWorkflowSteps,
} from '@/lib/assistant/ui-blocks/build-workflow-ui';
import { runDomainScanWorkflow } from '@/lib/assistant/workflows/domain-scan';
import { recordAssistantUsageEvent } from '@/lib/assistant/usage';
import {
  emitPhase,
  metadataWithStepList,
  type IntentHandler,
} from '@/lib/assistant/handlers/context';

export const handleDomainScanIntent: IntentHandler<'domain_scan'> = async (ctx, intent) => {
  emitPhase(ctx.emit, 'workflow', 'domain_scan');
  const workflowRun = await createAssistantWorkflowRun({
    id: randomUUID(),
    conversationId: ctx.conversationId,
    userId: ctx.user.id,
    type: 'domain_scan',
    steps: DOMAIN_SCAN_INITIAL_STEPS,
  });
  const workflowRunId = workflowRun.id;
  const result = await runDomainScanWorkflow(
    { url: intent.url, checkionProjectId: ctx.bindingIds?.checkionProjectId },
    { workflowRunId, initialSteps: workflowRun.steps }
  );
  const steps = result.steps;
  let assistantText: string;
  let metadata: Record<string, unknown> | undefined;

  if (result.ok && result.scan) {
    const scanUrl = result.scan.url || `https://${result.scan.domain}`;
    const enriched = await enrichWorkflowLayout(
      ctx,
      { workflowType: 'domain_scan', url: scanUrl, scan: result.scan },
      buildDomainScanLayout(result.scan)
    );
    assistantText = `## Domain Deep Scan\n\n**${result.scan.domain}** — ${result.scan.totalPages} Seiten, Score **${result.scan.score}**/100`;
    if (enriched.assistantInsightMarkdown) {
      assistantText += `\n\n${enriched.assistantInsightMarkdown}`;
    }
    metadata = metadataWithWorkflowSteps(
      {
        contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED,
        workflowRunId,
        workflowType: 'domain_scan',
        uiLayout: enriched.layout,
        ...workflowEnrichmentMetadata(enriched),
      },
      steps,
      'Domain Deep Scan'
    );
  } else {
    assistantText = `## Domain-Scan fehlgeschlagen\n\n${result.error ?? 'Unbekannter Fehler'}`;
    metadata = metadataWithStepList(
      { contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN, workflowRunId, workflowType: 'domain_scan' },
      steps,
      'Domain Deep Scan'
    );
  }
  await updateAssistantWorkflowRun(workflowRunId, { status: result.ok ? 'completed' : 'failed', steps });
  await recordAssistantUsageEvent({ userId: ctx.user.id, eventType: 'workflow_run', rawUnits: { workflow: 'domain_scan' } });
  return { assistantText, metadata, workflowRunId };
};
