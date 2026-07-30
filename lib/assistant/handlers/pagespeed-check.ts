import { randomUUID } from 'crypto';
import { createAssistantWorkflowRun, updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { ASSISTANT_MESSAGE_CONTENT_TYPE } from '@/lib/assistant/capabilities-overview';
import { buildPageSpeedLayout } from '@/lib/assistant/ui-blocks/build-scan-result-ui';
import {
  metadataWithWorkflowSteps,
  PAGESPEED_INITIAL_STEPS,
} from '@/lib/assistant/ui-blocks/build-workflow-ui';
import { fetchCheckionPageSpeed } from '@/lib/integrations/checkion-pagespeed-client';
import { recordAssistantUsageEvent } from '@/lib/assistant/usage';
import { enrichWorkflowLayout } from '@/lib/assistant/insights/enrich-workflow-layout';
import { workflowEnrichmentMetadata } from '@/lib/assistant/insights/enrichment-metadata';
import {
  emitPhase,
  metadataWithStepList,
  type IntentHandler,
} from '@/lib/assistant/handlers/context';

export const handlePagespeedCheckIntent: IntentHandler<'pagespeed_check'> = async (ctx, intent) => {
  emitPhase(ctx.emit, 'workflow', 'pagespeed_check');
  const workflowRun = await createAssistantWorkflowRun({
    id: randomUUID(),
    conversationId: ctx.conversationId,
    userId: ctx.user.id,
    type: 'pagespeed_check',
    steps: PAGESPEED_INITIAL_STEPS,
  });
  const workflowRunId = workflowRun.id;
  const result = await fetchCheckionPageSpeed(intent.url);
  let steps = [...PAGESPEED_INITIAL_STEPS];
  steps = steps.map((s) =>
    s.id === 'validate_url' ? { ...s, status: 'done' as const } : s
  );
  let assistantText: string;
  let metadata: Record<string, unknown> | undefined;

  if (result.ok) {
    steps = steps.map((s) => (s.id === 'fetch' ? { ...s, status: 'done' as const } : s));
    const dataLayout = buildPageSpeedLayout(result.data);
    const enriched = await enrichWorkflowLayout(
      ctx,
      { workflowType: 'pagespeed_check', url: result.data.url, pageSpeed: result.data },
      dataLayout
    );
    assistantText = `## PageSpeed\n\n**${result.data.url}** — Performance **${result.data.performance}**/100`;
    if (enriched.assistantInsightMarkdown) {
      assistantText += `\n\n${enriched.assistantInsightMarkdown}`;
    }
    metadata = metadataWithWorkflowSteps(
      {
        contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED,
        workflowRunId,
        workflowType: 'pagespeed_check',
        uiLayout: enriched.layout,
        ...workflowEnrichmentMetadata(enriched),
      },
      steps,
      'PageSpeed'
    );
  } else {
    steps = steps.map((s) =>
      s.id === 'fetch' ? { ...s, status: 'error' as const, detail: result.error } : s
    );
    assistantText = `## PageSpeed fehlgeschlagen\n\n${result.error}`;
    metadata = metadataWithStepList(
      { contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN, workflowRunId, workflowType: 'pagespeed_check' },
      steps,
      'PageSpeed'
    );
  }
  await updateAssistantWorkflowRun(workflowRunId, { status: result.ok ? 'completed' : 'failed', steps });
  await recordAssistantUsageEvent({ userId: ctx.user.id, eventType: 'workflow_run', rawUnits: { workflow: 'pagespeed_check' } });
  return { assistantText, metadata, workflowRunId };
};
