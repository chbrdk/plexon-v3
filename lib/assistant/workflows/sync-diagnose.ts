import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import { updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { probeCheckionApiHealth } from '@/lib/integrations/checkion-connectivity';
import { probeAudionApiHealth } from '@/lib/integrations/audion-connectivity';
import { SYNC_DIAGNOSE_INITIAL_STEPS } from '@/lib/assistant/ui-blocks/workflow-ui';
import { syncPlatformProjectToProducts } from '@/lib/platform-project-sync-service';
import type { RequestUser } from '@/lib/auth-request-user';

async function setStep(
  runId: string | undefined,
  steps: WorkflowStep[],
  stepId: string,
  patch: Partial<WorkflowStep>
): Promise<WorkflowStep[]> {
  const next = steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s));
  if (runId) {
    await updateAssistantWorkflowRun(runId, { steps: next, status: 'running' });
  }
  return next;
}

export async function runSyncDiagnoseWorkflow(
  _user: RequestUser,
  input: {
    platformProjectId?: string | null;
    checkionProjectId?: string | null;
    audionProjectId?: string | null;
    retrySync?: boolean;
  },
  options: { workflowRunId?: string; initialSteps?: WorkflowStep[] } = {}
): Promise<{
  checkion: Awaited<ReturnType<typeof probeCheckionApiHealth>>;
  audion: Awaited<ReturnType<typeof probeAudionApiHealth>>;
  retryMessage?: string;
  steps: WorkflowStep[];
}> {
  let steps = options.initialSteps ?? [...SYNC_DIAGNOSE_INITIAL_STEPS];
  const runId = options.workflowRunId;

  steps = await setStep(runId, steps, 'checkion_probe', { status: 'running' });
  const checkion = await probeCheckionApiHealth();
  steps = await setStep(runId, steps, 'checkion_probe', {
    status: checkion.ok ? 'done' : 'error',
    detail: checkion.hint,
  });

  steps = await setStep(runId, steps, 'audion_probe', { status: 'running' });
  const audion = await probeAudionApiHealth();
  steps = await setStep(runId, steps, 'audion_probe', {
    status: audion.ok ? 'done' : 'error',
    detail: audion.hint,
  });

  steps = await setStep(runId, steps, 'bindings', { status: 'running' });
  const bindingDetail = [
    input.checkionProjectId ? `CHECKION: ${input.checkionProjectId}` : 'CHECKION: —',
    input.audionProjectId ? `AUDION: ${input.audionProjectId}` : 'AUDION: —',
  ].join(', ');
  steps = await setStep(runId, steps, 'bindings', { status: 'done', detail: bindingDetail });

  let retryMessage: string | undefined;
  if (input.retrySync && input.platformProjectId) {
    steps = await setStep(runId, steps, 'retry', { status: 'running' });
    try {
      const sync = await syncPlatformProjectToProducts(input.platformProjectId);
      const failed = sync.filter((r) => !r.ok);
      retryMessage =
        failed.length === 0
          ? 'Sync-Retry erfolgreich.'
          : `Sync-Retry teilweise fehlgeschlagen: ${failed.map((f) => f.productId).join(', ')}`;
      steps = await setStep(runId, steps, 'retry', {
        status: failed.length === 0 ? 'done' : 'error',
        detail: retryMessage,
      });
    } catch (e) {
      retryMessage = e instanceof Error ? e.message : String(e);
      steps = await setStep(runId, steps, 'retry', { status: 'error', detail: retryMessage });
    }
  } else {
    steps = await setStep(runId, steps, 'retry', { status: 'pending', detail: 'Übersprungen' });
  }

  return { checkion, audion, retryMessage, steps };
}
