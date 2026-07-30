import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import { updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { READABILITY_CHECK_INITIAL_STEPS } from '@/lib/assistant/ui-blocks/workflow-ui';
import {
  fetchCheckionReadabilityForUrl,
  type ReadabilityCheckPreview,
} from '@/lib/integrations/checkion-tools-readability-client';

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

export async function runReadabilityCheckWorkflow(
  input: { url: string },
  options: { workflowRunId?: string; initialSteps?: WorkflowStep[] } = {}
): Promise<{
  ok: boolean;
  data?: ReadabilityCheckPreview;
  error?: string;
  steps: WorkflowStep[];
}> {
  let steps = options.initialSteps ?? [...READABILITY_CHECK_INITIAL_STEPS];
  const runId = options.workflowRunId;

  steps = await setStep(runId, steps, 'validate_url', { status: 'running' });
  if (!input.url.trim()) {
    steps = await setStep(runId, steps, 'validate_url', { status: 'error', detail: 'URL fehlt' });
    return { ok: false, error: 'URL fehlt', steps };
  }
  steps = await setStep(runId, steps, 'validate_url', { status: 'done' });

  steps = await setStep(runId, steps, 'extract', { status: 'running' });
  steps = await setStep(runId, steps, 'analyze', { status: 'running' });
  const result = await fetchCheckionReadabilityForUrl(input.url);
  if (!result.ok) {
    steps = await setStep(runId, steps, 'extract', { status: 'error', detail: result.error });
    steps = await setStep(runId, steps, 'analyze', { status: 'error' });
    return { ok: false, error: result.error, steps };
  }
  steps = await setStep(runId, steps, 'extract', { status: 'done' });
  steps = await setStep(runId, steps, 'analyze', { status: 'done' });
  return { ok: true, data: result.data, steps };
}
