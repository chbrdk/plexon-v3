import { randomUUID } from 'crypto';
import { createAssistantWorkflowRun, updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import { ASSISTANT_MESSAGE_CONTENT_TYPE } from '@/lib/assistant/capabilities-overview';
import {
  buildPersonaBootstrapLayout,
  type PersonaBootstrapPreview,
} from '@/lib/assistant/ui-blocks/build-persona-bootstrap-ui';
import {
  metadataWithWorkflowSteps,
  PERSONA_BOOTSTRAP_INITIAL_STEPS,
} from '@/lib/assistant/ui-blocks/build-workflow-ui';
import { executeAudionPersonaBootstrapCapability } from '@/lib/capabilities/executors/audion-persona-bootstrap';
import { isCapabilityCatalogRuntimeEnabled } from '@/lib/capabilities/runtime-flag';
import { runPersonaBootstrap } from '@/lib/integrations/audion-persona-bootstrap-client';
import { recordAssistantUsageEvent } from '@/lib/assistant/usage';
import {
  emitPhase,
  metadataWithStepList,
  type IntentHandler,
} from '@/lib/assistant/handlers/context';

export const handlePersonaBootstrapIntent: IntentHandler<'persona_bootstrap'> = async (ctx, intent) => {
  emitPhase(ctx.emit, 'workflow', 'persona_bootstrap');
  const workflowRun = await createAssistantWorkflowRun({
    id: randomUUID(),
    conversationId: ctx.conversationId,
    userId: ctx.user.id,
    type: 'persona_bootstrap',
    steps: PERSONA_BOOTSTRAP_INITIAL_STEPS,
  });
  const workflowRunId = workflowRun.id;

  let bootstrap: { ok: true; preview: PersonaBootstrapPreview } | { ok: false; error?: string };
  if (isCapabilityCatalogRuntimeEnabled()) {
    const cap = await executeAudionPersonaBootstrapCapability(
      {
        name: ctx.resolvedName(intent.name),
        targetGroupName: ctx.resolvedName(intent.targetGroupName),
      },
      {
        source: 'agent',
        audionProjectId: ctx.bindingIds?.audionProjectId,
      }
    );
    if (cap.ok && cap.agentPayload?.preview) {
      bootstrap = { ok: true, preview: cap.agentPayload.preview };
    } else {
      bootstrap = { ok: false, error: cap.error ?? 'Bootstrap fehlgeschlagen' };
    }
  } else {
    bootstrap = await runPersonaBootstrap({
      projectName: ctx.resolvedName(intent.name),
      targetGroupName: ctx.resolvedName(intent.targetGroupName),
      existingAudionProjectId: ctx.bindingIds?.audionProjectId,
    });
  }

  const steps = PERSONA_BOOTSTRAP_INITIAL_STEPS.map((s, i) => ({
    ...s,
    status: (bootstrap.ok ? 'done' : i === 0 ? 'error' : 'pending') as WorkflowStep['status'],
  }));
  let assistantText: string;
  let metadata: Record<string, unknown> | undefined;

  if (bootstrap.ok) {
    const layout = buildPersonaBootstrapLayout(bootstrap.preview);
    assistantText = `## Persona-Bootstrap\n\nProjekt **${bootstrap.preview.projectName}** mit Zielgruppe **${bootstrap.preview.targetGroupName}**.`;
    metadata = metadataWithWorkflowSteps(
      {
        contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED,
        workflowRunId,
        workflowType: 'persona_bootstrap',
        uiLayout: layout,
      },
      steps,
      'Persona-Bootstrap'
    );
  } else {
    assistantText = `## Fehler\n\n${bootstrap.error ?? 'Bootstrap fehlgeschlagen'}`;
    metadata = metadataWithStepList(
      { contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.MARKDOWN, workflowRunId, workflowType: 'persona_bootstrap' },
      steps,
      'Persona-Bootstrap'
    );
  }
  await updateAssistantWorkflowRun(workflowRunId, { status: bootstrap.ok ? 'completed' : 'failed', steps });
  await recordAssistantUsageEvent({ userId: ctx.user.id, eventType: 'workflow_run', rawUnits: { workflow: 'persona_bootstrap' } });
  return { assistantText, metadata, workflowRunId };
};
