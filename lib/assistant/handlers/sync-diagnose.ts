import { randomUUID } from 'crypto';
import { createAssistantWorkflowRun, updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { ASSISTANT_MESSAGE_CONTENT_TYPE } from '@/lib/assistant/capabilities-overview';
import { buildSyncDiagnoseLayout } from '@/lib/assistant/ui-blocks/build-sync-diagnose-ui';
import {
  metadataWithWorkflowSteps,
  SYNC_DIAGNOSE_INITIAL_STEPS,
} from '@/lib/assistant/ui-blocks/build-workflow-ui';
import { runSyncDiagnoseWorkflow } from '@/lib/assistant/workflows/sync-diagnose';
import { recordAssistantUsageEvent } from '@/lib/assistant/usage';
import {
  emitPhase,
  type IntentHandler,
} from '@/lib/assistant/handlers/context';

export const handleSyncDiagnoseIntent: IntentHandler<'sync_diagnose'> = async (ctx) => {
  emitPhase(ctx.emit, 'workflow', 'sync_diagnose');
  const workflowRun = await createAssistantWorkflowRun({
    id: randomUUID(),
    conversationId: ctx.conversationId,
    userId: ctx.user.id,
    type: 'sync_diagnose',
    steps: SYNC_DIAGNOSE_INITIAL_STEPS,
  });
  const workflowRunId = workflowRun.id;
  const diag = await runSyncDiagnoseWorkflow(
    ctx.user,
    {
      platformProjectId: ctx.platformProjectId,
      checkionProjectId: ctx.bindingIds?.checkionProjectId,
      audionProjectId: ctx.bindingIds?.audionProjectId,
      retrySync: /\bretry|erneut|nochmal\b/i.test(ctx.prompt),
    },
    { workflowRunId, initialSteps: workflowRun.steps }
  );
  await updateAssistantWorkflowRun(workflowRunId, { status: 'completed', steps: diag.steps });
  const layout = buildSyncDiagnoseLayout({
    checkion: diag.checkion,
    audion: diag.audion,
    platformProjectId: ctx.platformProjectId,
    checkionProjectId: ctx.bindingIds?.checkionProjectId,
    audionProjectId: ctx.bindingIds?.audionProjectId,
    retryMessage: diag.retryMessage,
  });
  const assistantText = '## Sync-Diagnose\n\nCHECKION und AUDION-Konnektivität wurde geprüft.';
  const metadata = metadataWithWorkflowSteps(
    {
      contentType: ASSISTANT_MESSAGE_CONTENT_TYPE.UI_COMPOSED,
      workflowRunId,
      workflowType: 'sync_diagnose',
      uiLayout: layout,
    },
    diag.steps,
    'Sync-Diagnose'
  );
  await recordAssistantUsageEvent({ userId: ctx.user.id, eventType: 'workflow_run', rawUnits: { workflow: 'sync_diagnose' } });
  return { assistantText, metadata, workflowRunId };
};
