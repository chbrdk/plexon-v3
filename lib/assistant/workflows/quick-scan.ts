import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import type { ScanResultPreview } from '@/lib/assistant/ui-blocks/build-scan-result-ui';
import { executeCheckionScanCapability } from '@/lib/capabilities/executors/checkion-scan';
import { isCapabilityCatalogRuntimeEnabled } from '@/lib/capabilities/runtime-flag';
import { runCheckionQuickScan } from '@/lib/integrations/checkion-scan-client';
import { QUICK_SCAN_INITIAL_STEPS } from '@/lib/assistant/ui-blocks/workflow-ui';
import { tryAutoAssignCheckionResource } from '@/lib/assistant/auto-assign-checkion';
import {
  patchWorkflowSteps,
  type WorkflowStepEmitter,
} from '@/lib/assistant/workflows/workflow-step-stream';

export type QuickScanWorkflowOptions = {
  workflowRunId?: string;
  initialSteps?: WorkflowStep[];
  emit?: WorkflowStepEmitter;
  workflowType?: string;
  stepListTitle?: string;
};

export async function runQuickScanWorkflow(
  input: { url: string; checkionProjectId?: string | null },
  options: QuickScanWorkflowOptions = {}
): Promise<{
  ok: boolean;
  scan?: ScanResultPreview;
  error?: string;
  steps: WorkflowStep[];
}> {
  let steps = options.initialSteps ?? [...QUICK_SCAN_INITIAL_STEPS];
  const runId = options.workflowRunId;
  const stream = {
    runId,
    emit: options.emit,
    workflowType: options.workflowType ?? 'quick_scan',
    title: options.stepListTitle ?? 'Accessibility-Scan',
  };

  steps = await patchWorkflowSteps({
    ...stream,
    steps,
    stepId: 'validate_url',
    patch: { status: 'running' },
  });
  if (!input.url.trim()) {
    steps = await patchWorkflowSteps({
      ...stream,
      steps,
      stepId: 'validate_url',
      patch: { status: 'error', detail: 'URL fehlt' },
    });
    return { ok: false, error: 'URL fehlt', steps };
  }
  steps = await patchWorkflowSteps({
    ...stream,
    steps,
    stepId: 'validate_url',
    patch: { status: 'done' },
  });

  steps = await patchWorkflowSteps({
    ...stream,
    steps,
    stepId: 'run_scan',
    patch: { status: 'running', progress: 10 },
  });

  let scan: ScanResultPreview | undefined;
  let scanError: string | undefined;

  if (isCapabilityCatalogRuntimeEnabled()) {
    const cap = await executeCheckionScanCapability(
      { url: input.url },
      {
        source: 'agent',
        checkionProjectId: input.checkionProjectId,
      }
    );
    if (
      cap.ok &&
      cap.agentPayload &&
      cap.agentPayload.variant === 'agent'
    ) {
      scan = cap.agentPayload.scan;
    } else {
      scanError = cap.error ?? 'Scan fehlgeschlagen';
    }
  } else {
    const result = await runCheckionQuickScan({
      url: input.url,
      checkionProjectId: input.checkionProjectId,
    });
    if (result.ok) scan = result.scan;
    else scanError = result.error;
  }

  if (!scan) {
    steps = await patchWorkflowSteps({
      ...stream,
      steps,
      stepId: 'run_scan',
      patch: { status: 'error', detail: scanError },
    });
    steps = await patchWorkflowSteps({
      ...stream,
      steps,
      stepId: 'aggregate',
      patch: { status: 'error' },
    });
    return { ok: false, error: scanError, steps };
  }

  steps = await patchWorkflowSteps({
    ...stream,
    steps,
    stepId: 'run_scan',
    patch: { status: 'done', progress: 100 },
  });

  const assign = await tryAutoAssignCheckionResource({
    kind: 'scan',
    resourceId: scan.id,
    checkionProjectId: input.checkionProjectId,
  });
  if (assign.error) {
    steps = await patchWorkflowSteps({
      ...stream,
      steps,
      stepId: 'aggregate',
      patch: { status: 'done', detail: `Scan OK · Assign: ${assign.error}` },
    });
  } else {
    steps = await patchWorkflowSteps({
      ...stream,
      steps,
      stepId: 'aggregate',
      patch: {
        status: 'done',
        detail: assign.assigned ? 'Scan OK · Projekt zugeordnet' : undefined,
      },
    });
  }

  return { ok: true, scan, steps };
}
