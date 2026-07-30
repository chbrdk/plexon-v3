import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import { updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { CONTRAST_CHECK_INITIAL_STEPS } from '@/lib/assistant/ui-blocks/workflow-ui';
import {
  fetchCheckionContrastCheck,
  type ContrastCheckPreview,
} from '@/lib/integrations/checkion-tools-contrast-client';

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

export async function runContrastCheckWorkflow(
  input: { foreground: string; background: string },
  options: { workflowRunId?: string; initialSteps?: WorkflowStep[] } = {}
): Promise<{
  ok: boolean;
  data?: ContrastCheckPreview;
  error?: string;
  steps: WorkflowStep[];
}> {
  let steps = options.initialSteps ?? [...CONTRAST_CHECK_INITIAL_STEPS];
  const runId = options.workflowRunId;

  steps = await setStep(runId, steps, 'validate_colors', { status: 'running' });
  const result = await fetchCheckionContrastCheck(input);
  if (!result.ok) {
    steps = await setStep(runId, steps, 'validate_colors', { status: 'error', detail: result.error });
    return { ok: false, error: result.error, steps };
  }
  steps = await setStep(runId, steps, 'validate_colors', { status: 'done' });

  steps = await setStep(runId, steps, 'fetch', { status: 'running' });
  steps = await setStep(runId, steps, 'fetch', { status: 'done' });
  return { ok: true, data: result.data, steps };
}
