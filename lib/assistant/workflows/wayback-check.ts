import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import { updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { WAYBACK_CHECK_INITIAL_STEPS } from '@/lib/assistant/ui-blocks/workflow-ui';
import {
  fetchCheckionWaybackCheck,
  type WaybackCheckPreview,
} from '@/lib/integrations/checkion-tools-wayback-client';

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

export async function runWaybackCheckWorkflow(
  input: { url: string },
  options: { workflowRunId?: string; initialSteps?: WorkflowStep[] } = {}
): Promise<{
  ok: boolean;
  data?: WaybackCheckPreview;
  error?: string;
  steps: WorkflowStep[];
}> {
  let steps = options.initialSteps ?? [...WAYBACK_CHECK_INITIAL_STEPS];
  const runId = options.workflowRunId;

  steps = await setStep(runId, steps, 'validate_url', { status: 'running' });
  if (!input.url.trim()) {
    steps = await setStep(runId, steps, 'validate_url', { status: 'error', detail: 'URL fehlt' });
    return { ok: false, error: 'URL fehlt', steps };
  }
  steps = await setStep(runId, steps, 'validate_url', { status: 'done' });

  steps = await setStep(runId, steps, 'fetch', { status: 'running' });
  const result = await fetchCheckionWaybackCheck(input.url);
  if (!result.ok) {
    steps = await setStep(runId, steps, 'fetch', { status: 'error', detail: result.error });
    return { ok: false, error: result.error, steps };
  }

  steps = await setStep(runId, steps, 'fetch', { status: 'done' });
  return { ok: true, data: result.data, steps };
}
