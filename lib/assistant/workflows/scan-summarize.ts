import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import { updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { SCAN_SUMMARIZE_INITIAL_STEPS } from '@/lib/assistant/ui-blocks/workflow-ui';
import {
  fetchCheckionScanSummarize,
  type ScanSummarizePreview,
} from '@/lib/integrations/checkion-scan-summarize-client';

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

export async function runScanSummarizeWorkflow(
  input: { scanId: string },
  options: { workflowRunId?: string; initialSteps?: WorkflowStep[] } = {}
): Promise<{
  ok: boolean;
  data?: ScanSummarizePreview;
  error?: string;
  steps: WorkflowStep[];
}> {
  let steps = options.initialSteps ?? [...SCAN_SUMMARIZE_INITIAL_STEPS];
  const runId = options.workflowRunId;

  steps = await setStep(runId, steps, 'resolve_scan', { status: 'running' });
  if (!input.scanId.trim()) {
    steps = await setStep(runId, steps, 'resolve_scan', { status: 'error', detail: 'Scan-ID fehlt' });
    return { ok: false, error: 'Scan-ID fehlt', steps };
  }
  steps = await setStep(runId, steps, 'resolve_scan', { status: 'done', detail: input.scanId });

  steps = await setStep(runId, steps, 'summarize', { status: 'running' });
  const result = await fetchCheckionScanSummarize(input.scanId);
  if (!result.ok) {
    steps = await setStep(runId, steps, 'summarize', { status: 'error', detail: result.error });
    return { ok: false, error: result.error, steps };
  }
  steps = await setStep(runId, steps, 'summarize', { status: 'done' });
  return { ok: true, data: result.data, steps };
}
