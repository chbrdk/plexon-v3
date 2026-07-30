import { randomUUID } from 'crypto';
import { createAssistantWorkflowRun, updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { ASSISTANT_MESSAGE_CONTENT_TYPE } from '@/lib/assistant/capabilities-overview';
import { enrichWorkflowLayout } from '@/lib/assistant/insights/enrich-workflow-layout';
import { workflowEnrichmentMetadata } from '@/lib/assistant/insights/enrichment-metadata';
import { buildSslCheckLayout } from '@/lib/assistant/ui-blocks/build-ssl-ui';
import {
  metadataWithWorkflowSteps,
  SSL_CHECK_INITIAL_STEPS,
} from '@/lib/assistant/ui-blocks/build-workflow-ui';
import { runSslCheckWorkflow } from '@/lib/assistant/workflows/ssl-check';
import { recordAssistantUsageEvent } from '@/lib/assistant/usage';
import {
  emitPhase,
  metadataWithStepList,
  type IntentHandler,
} from '@/lib/assistant/handlers/context';

export const handleSslCheckIntent: IntentHandler<'ssl_check'> = async (ctx, intent) => {
  emitPhase(ctx.emit, 'workflow', 'ssl_check');
  const workflowRun = await createAssistantWorkflowRun({
    id: randomUUID(),
    conversationId: ctx.conversationId,
    userId: ctx.user.id,
    type: 'ssl_check',
    steps: SSL_CHECK_INITIAL_STEPS,
  });
  const workflowRunId = workflowRun.id;
  const result = await runSslCheckWorkflow(
    { host: intent.host },
    { workflowRunId, initialSteps: workflowRun.steps }
  );
  const steps = result.steps;
  let assistantText: string;
  let metadata: Record<string, unknown> | undefined;

  if (result.ok && result.data) {
    const enriched = await enrichWorkflowLayout(
      ctx,
      { workflowType: 'ssl_check', host: result.data.host, ssl: result.data },
      buildSslCheckLayout(result.data)
    );
    assistantText = `## SSL-Check\n\n**${result.data.host}** — Grade **${result.data.grade ?? '—'}**`;
    if (enriched.assistantInsightMarkdown) {
      assistantText += `\n\n${enriched.assistantInsightMarkdown}`;
    }
    metadata = metadataWithWorkflowSteps(
      {
        contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED,
        workflowRunId,
        workflowType: 'ssl_check',
        uiLayout: enriched.layout,
        ...workflowEnrichmentMetadata(enriched),
      },
      steps,
      'SSL-Check'
    );
  } else {
    assistantText = `## SSL-Check fehlgeschlagen\n\n${result.error ?? 'Unbekannter Fehler'}`;
    metadata = metadataWithStepList(
      { contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN, workflowRunId, workflowType: 'ssl_check' },
      steps,
      'SSL-Check'
    );
  }
  await updateAssistantWorkflowRun(workflowRunId, { status: result.ok ? 'completed' : 'failed', steps });
  await recordAssistantUsageEvent({ userId: ctx.user.id, eventType: 'workflow_run', rawUnits: { workflow: 'ssl_check' } });
  return { assistantText, metadata, workflowRunId };
};
