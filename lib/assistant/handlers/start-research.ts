import { randomUUID } from 'crypto';
import { createAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { ASSISTANT_MESSAGE_CONTENT_TYPE } from '@/lib/assistant/capabilities-overview';
import { PARALLEL_RESEARCH_INITIAL_STEPS } from '@/lib/assistant/ui-blocks/build-workflow-ui';
import { runParallelResearchWorkflow } from '@/lib/assistant/workflows/parallel-research';
import { recordAssistantUsageEvent } from '@/lib/assistant/usage';
import {
  emitPhase,
  metadataWithStepList,
  type IntentHandler,
} from '@/lib/assistant/handlers/context';

export const handleStartResearchIntent: IntentHandler<'start_research'> = async (ctx) => {
  emitPhase(ctx.emit, 'workflow', 'parallel_research');
  if (!ctx.platformProjectId) {
    return {
      assistantText:
        '## Projekt auswählen\n\nBitte wähle zuerst ein Projekt im Kontext-Dropdown oder nenne die Plattform-Projekt-ID.',
      metadata: { contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN },
    };
  }

  const researchRun = await createAssistantWorkflowRun({
    id: randomUUID(),
    conversationId: ctx.conversationId,
    userId: ctx.user.id,
    type: 'parallel_research',
    steps: PARALLEL_RESEARCH_INITIAL_STEPS,
  });
  const workflowRunId = researchRun.id;
  void runParallelResearchWorkflow({
    runId: researchRun.id,
    user: ctx.user,
    platformProjectId: ctx.platformProjectId,
    domain: null,
  }).catch((e) => console.error('[assistant] research failed', e));
  const assistantText = `## Research gestartet\n\nResearch läuft für Projekt \`${ctx.platformProjectId}\`. Den Fortschritt siehst du in der Schrittliste unten.`;
  const metadata = metadataWithStepList(
    {
      contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN,
      workflowRunId,
      workflowType: 'parallel_research',
    },
    researchRun.steps,
    'Research'
  );
  await recordAssistantUsageEvent({
    userId: ctx.user.id,
    eventType: 'workflow_run',
    rawUnits: { workflow: 'parallel_research' },
  });
  return { assistantText, metadata, workflowRunId };
};
