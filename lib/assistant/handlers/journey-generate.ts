import { randomUUID } from 'crypto';
import { createAssistantWorkflowRun, updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import { ASSISTANT_MESSAGE_CONTENT_TYPE } from '@/lib/assistant/capabilities-overview';
import { buildJourneyDetailLayout } from '@/lib/assistant/ui-blocks/build-journey-outline-ui';
import {
  JOURNEY_GENERATE_INITIAL_STEPS,
  metadataWithWorkflowSteps,
} from '@/lib/assistant/ui-blocks/build-workflow-ui';
import { runJourneyGenerate } from '@/lib/integrations/audion-journey-outline-client';
import { recordAssistantUsageEvent } from '@/lib/assistant/usage';
import {
  emitPhase,
  metadataWithStepList,
  type IntentHandler,
} from '@/lib/assistant/handlers/context';

function markSteps(
  ok: boolean,
  validateRan: boolean,
  validateError?: string
): WorkflowStep[] {
  return JOURNEY_GENERATE_INITIAL_STEPS.map((s) => {
    if (!ok) {
      if (s.id === 'resolve_project' || s.id === 'generate') {
        return { ...s, status: 'error' as const };
      }
      return { ...s, status: 'pending' as const };
    }
    if (s.id === 'validate') {
      if (validateError && !validateRan) {
        return { ...s, status: 'error' as const, detail: validateError.slice(0, 80) };
      }
      return { ...s, status: 'done' as const };
    }
    return { ...s, status: 'done' as const };
  });
}

export const handleJourneyGenerateIntent: IntentHandler<'journey_generate'> = async (ctx, intent) => {
  emitPhase(ctx.emit, 'workflow', 'journey_generate');
  const workflowRun = await createAssistantWorkflowRun({
    id: randomUUID(),
    conversationId: ctx.conversationId,
    userId: ctx.user.id,
    type: 'journey_generate',
    steps: JOURNEY_GENERATE_INITIAL_STEPS,
  });
  const workflowRunId = workflowRun.id;

  const result = await runJourneyGenerate({
    plexonUserId: ctx.user.id,
    platformProjectId: ctx.platformProjectId,
    audionProjectId: ctx.bindingIds?.audionProjectId,
    journeyType: intent.journeyType,
    targetGroupName: ctx.resolvedName(intent.targetGroupName),
    validate: intent.validate !== false,
  });

  const steps = markSteps(
    result.ok,
    result.ok ? result.preview.validateRan : false,
    result.ok ? result.preview.validateError : undefined
  );

  let assistantText: string;
  let metadata: Record<string, unknown> | undefined;

  if (result.ok) {
    const { preview } = result;
    const layout = buildJourneyDetailLayout({
      journeyId: preview.journeyId,
      journeyName: preview.journeyName,
      journeyHref: preview.journeyHref,
      phases: preview.phases,
      quotes: preview.quotes,
      findings: preview.findings,
      recommendations: preview.recommendations,
      error: preview.validateError,
    });
    const fit =
      typeof preview.overallFitScore === 'number'
        ? ` Fit-Score **${preview.overallFitScore}**.`
        : '';
    assistantText = `## Journey generiert\n\n**${preview.journeyName}** · ${preview.phases.length} Phasen.${fit}\n\nPhasen anklicken, um Moments zu wechseln.`;
    metadata = metadataWithWorkflowSteps(
      {
        contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED,
        workflowRunId,
        workflowType: 'journey_generate',
        uiLayout: layout,
        journeyId: preview.journeyId,
      },
      steps,
      'Journey generieren'
    );
  } else {
    assistantText = `## Fehler\n\n${result.error}`;
    metadata = metadataWithStepList(
      {
        contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN,
        workflowRunId,
        workflowType: 'journey_generate',
      },
      steps,
      'Journey generieren'
    );
  }

  await updateAssistantWorkflowRun(workflowRunId, {
    status: result.ok ? 'completed' : 'failed',
    steps,
  });
  await recordAssistantUsageEvent({
    userId: ctx.user.id,
    eventType: 'workflow_run',
    rawUnits: { workflow: 'journey_generate' },
  });
  return { assistantText, metadata, workflowRunId };
};
