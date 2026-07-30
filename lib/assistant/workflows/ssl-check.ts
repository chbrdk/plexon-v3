import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import { updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { SSL_CHECK_INITIAL_STEPS } from '@/lib/assistant/ui-blocks/workflow-ui';
import {
  fetchCheckionSslCheck,
  type SslCheckPreview,
} from '@/lib/integrations/checkion-tools-ssl-client';

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

export async function runSslCheckWorkflow(
  input: { host: string },
  options: { workflowRunId?: string; initialSteps?: WorkflowStep[] } = {}
): Promise<{
  ok: boolean;
  data?: SslCheckPreview;
  error?: string;
  steps: WorkflowStep[];
}> {
  let steps = options.initialSteps ?? [...SSL_CHECK_INITIAL_STEPS];
  const runId = options.workflowRunId;

  steps = await setStep(runId, steps, 'validate_host', { status: 'running' });
  if (!input.host.trim()) {
    steps = await setStep(runId, steps, 'validate_host', { status: 'error', detail: 'Host fehlt' });
    return { ok: false, error: 'Host fehlt', steps };
  }
  steps = await setStep(runId, steps, 'validate_host', { status: 'done' });

  steps = await setStep(runId, steps, 'fetch', { status: 'running' });
  const result = await fetchCheckionSslCheck(input.host);
  if (!result.ok) {
    steps = await setStep(runId, steps, 'fetch', { status: 'error', detail: result.error });
    return { ok: false, error: result.error, steps };
  }

  steps = await setStep(runId, steps, 'fetch', { status: 'done' });
  return { ok: true, data: result.data, steps };
}
