import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import { updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import type { DomainScanPreview } from '@/lib/integrations/checkion-domain-scan-client';
import {
  fetchCheckionDomainScanSummary,
  pollCheckionDomainScan,
  startCheckionDomainScan,
} from '@/lib/integrations/checkion-domain-scan-client';
import { DOMAIN_SCAN_INITIAL_STEPS } from '@/lib/assistant/ui-blocks/workflow-ui';
import { tryAutoAssignCheckionResource } from '@/lib/assistant/auto-assign-checkion';

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

export async function runDomainScanWorkflow(
  input: { url: string; checkionProjectId?: string | null; maxPages?: number },
  options: {
    workflowRunId?: string;
    initialSteps?: WorkflowStep[];
    onExternalProgress?: (status: string, progress?: number) => void | Promise<void>;
  } = {}
): Promise<{
  ok: boolean;
  scan?: DomainScanPreview;
  scanId?: string;
  error?: string;
  steps: WorkflowStep[];
}> {
  let steps = options.initialSteps ?? [...DOMAIN_SCAN_INITIAL_STEPS];
  const runId = options.workflowRunId;

  steps = await setStep(runId, steps, 'validate_url', { status: 'running' });
  if (!input.url.trim()) {
    steps = await setStep(runId, steps, 'validate_url', { status: 'error', detail: 'URL fehlt' });
    return { ok: false, error: 'URL fehlt', steps };
  }
  steps = await setStep(runId, steps, 'validate_url', { status: 'done' });

  steps = await setStep(runId, steps, 'start_scan', { status: 'running' });
  const started = await startCheckionDomainScan({
    url: input.url,
    checkionProjectId: input.checkionProjectId,
    maxPages: input.maxPages,
  });
  if (!started.ok) {
    steps = await setStep(runId, steps, 'start_scan', { status: 'error', detail: started.error });
    return { ok: false, error: started.error, steps };
  }
  steps = await setStep(runId, steps, 'start_scan', { status: 'done', detail: started.scanId });

  const assign = await tryAutoAssignCheckionResource({
    kind: 'domain_scan',
    resourceId: started.scanId,
    checkionProjectId: input.checkionProjectId,
  });
  if (assign.error) {
    steps = await setStep(runId, steps, 'start_scan', {
      status: 'done',
      detail: `${started.scanId} · Assign: ${assign.error}`,
    });
  }

  steps = await setStep(runId, steps, 'poll_scan', { status: 'running', progress: 5 });
  const polled = await pollCheckionDomainScan(started.scanId, {
    onProgress: async (status, progress) => {
      await options.onExternalProgress?.(status, progress);
      steps = await setStep(runId, steps, 'poll_scan', {
        status: 'running',
        ...(progress != null ? { progress } : {}),
        detail: status,
      });
    },
  });
  if (!polled.ok) {
    steps = await setStep(runId, steps, 'poll_scan', { status: 'error', detail: polled.error });
    steps = await setStep(runId, steps, 'aggregate', { status: 'error' });
    return { ok: false, error: polled.error, scanId: started.scanId, steps };
  }
  steps = await setStep(runId, steps, 'poll_scan', { status: 'done', progress: 100 });

  steps = await setStep(runId, steps, 'aggregate', { status: 'running' });
  const summary = await fetchCheckionDomainScanSummary(started.scanId);
  if (!summary.ok) {
    steps = await setStep(runId, steps, 'aggregate', { status: 'error', detail: summary.error });
    return { ok: false, error: summary.error, scanId: started.scanId, steps };
  }
  steps = await setStep(runId, steps, 'aggregate', { status: 'done' });

  return { ok: true, scan: summary.preview, scanId: started.scanId, steps };
}
