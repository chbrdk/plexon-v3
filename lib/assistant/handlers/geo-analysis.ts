import { randomUUID } from 'crypto';
import { createAssistantWorkflowRun, updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { ASSISTANT_MESSAGE_CONTENT_TYPE } from '@/lib/assistant/capabilities-overview';
import { buildGeoEeatLayout } from '@/lib/assistant/ui-blocks/build-geo-ui';
import {
  GEO_ANALYSIS_INITIAL_STEPS,
  metadataWithWorkflowSteps,
} from '@/lib/assistant/ui-blocks/build-workflow-ui';
import { runGeoAnalysisWorkflow } from '@/lib/assistant/workflows/geo-analysis';
import { recordAssistantUsageEvent } from '@/lib/assistant/usage';
import { enrichWorkflowLayout } from '@/lib/assistant/insights/enrich-workflow-layout';
import { workflowEnrichmentMetadata } from '@/lib/assistant/insights/enrichment-metadata';
import {
  emitPhase,
  metadataWithStepList,
  type IntentHandler,
} from '@/lib/assistant/handlers/context';

export const handleGeoAnalysisIntent: IntentHandler<'geo_analysis'> = async (ctx, intent) => {
  emitPhase(ctx.emit, 'workflow', 'geo_analysis');
  const workflowRun = await createAssistantWorkflowRun({
    id: randomUUID(),
    conversationId: ctx.conversationId,
    userId: ctx.user.id,
    type: 'geo_analysis',
    steps: GEO_ANALYSIS_INITIAL_STEPS,
  });
  const workflowRunId = workflowRun.id;
  const geo = await runGeoAnalysisWorkflow(
    {
      url: intent.url,
      checkionProjectId: ctx.bindingIds?.checkionProjectId,
      deep: intent.deep,
    },
    { workflowRunId, initialSteps: workflowRun.steps }
  );
  const steps = geo.steps;
  let assistantText: string;
  let metadata: Record<string, unknown> | undefined;

  if (geo.ok && geo.job) {
    const dataLayout = buildGeoEeatLayout(geo.job);
    const enriched = await enrichWorkflowLayout(ctx, {
      workflowType: 'geo_analysis',
      url: intent.url,
      job: geo.job,
    }, dataLayout);
    assistantText = `## GEO / E-E-A-T\n\nAnalyse für **${intent.url}** (Job \`${geo.jobId}\`).`;
    if (geo.competitiveWarning) {
      assistantText += `\n\n_Wettbewerbs-Rerun: ${geo.competitiveWarning}_`;
    }
    if (enriched.assistantInsightMarkdown) {
      assistantText += `\n\n${enriched.assistantInsightMarkdown}`;
    }
    metadata = metadataWithWorkflowSteps(
      {
        contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED,
        workflowRunId,
        workflowType: 'geo_analysis',
        uiLayout: enriched.layout,
        ...workflowEnrichmentMetadata(enriched),
      },
      steps,
      'GEO / E-E-A-T'
    );
  } else {
    assistantText = `## GEO fehlgeschlagen\n\n${geo.error ?? 'Unbekannter Fehler'}`;
    metadata = metadataWithStepList(
      { contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN, workflowRunId, workflowType: 'geo_analysis' },
      steps,
      'GEO / E-E-A-T'
    );
  }
  await updateAssistantWorkflowRun(workflowRunId, { status: geo.ok ? 'completed' : 'failed', steps });
  await recordAssistantUsageEvent({ userId: ctx.user.id, eventType: 'workflow_run', rawUnits: { workflow: 'geo_analysis' } });
  return { assistantText, metadata, workflowRunId };
};
