import { handleLocalProductCreate } from '@/lib/assistant/handle-local-product-create';
import { recordAssistantUsageEvent } from '@/lib/assistant/usage';
import { emitPhase, type AssistantHandlerContext, type IntentHandler } from '@/lib/assistant/handlers/context';

export const handleCreateAudionProjectIntent: IntentHandler<'create_audion_project'> = async (ctx, intent) => {
  const out = await handleLocalProductCreate({
    product: 'audion',
    name: ctx.resolvedName(intent.name),
    conversationId: ctx.conversationId,
    userId: ctx.user.id,
    emitPhase: (phase, detail) => emitPhase(ctx.emit, phase, detail),
  });
  await recordAssistantUsageEvent({
    userId: ctx.user.id,
    eventType: 'workflow_run',
    rawUnits: { workflow: 'create_audion_project' },
  });
  return {
    assistantText: out.assistantText,
    metadata: out.metadata,
    workflowRunId: out.workflowRunId,
    conversationPatch: out.projectName ? { title: out.projectName } : undefined,
  };
};

export const handleCreateCheckionProjectIntent: IntentHandler<'create_checkion_project'> = async (ctx, intent) => {
  const out = await handleLocalProductCreate({
    product: 'checkion',
    name: ctx.resolvedName(intent.name),
    domain: ctx.resolvedDomain(intent.domain),
    conversationId: ctx.conversationId,
    userId: ctx.user.id,
    emitPhase: (phase, detail) => emitPhase(ctx.emit, phase, detail),
  });
  await recordAssistantUsageEvent({
    userId: ctx.user.id,
    eventType: 'workflow_run',
    rawUnits: { workflow: 'create_checkion_project' },
  });
  return {
    assistantText: out.assistantText,
    metadata: out.metadata,
    workflowRunId: out.workflowRunId,
    conversationPatch: out.projectName ? { title: out.projectName } : undefined,
  };
};
