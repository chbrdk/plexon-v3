import type { RequestUser } from '@/lib/auth-request-user';
import {
  executeEventQuickCheckRun,
  type ExecuteEventQuickCheckRunResult,
} from '@/lib/assistant/event-quick-check/execute-event-quick-check-page';
import { getAssistantWorkflowRunById, updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { userCanAccessEventQuickCheckRun } from '@/lib/assistant/event-quick-check/authorize-event-quick-check-run';
import type { GeoMeasurement } from '@/lib/geo/measurement';
import {
  EVENT_QUICK_CHECK_AWAITING_DEEP_SCAN_KEY,
  EVENT_QUICK_CHECK_CHECKPOINT_KEY,
  EVENT_QUICK_CHECK_GEO_QUESTIONS_CONFIRMED_KEY,
  EVENT_QUICK_CHECK_GEO_MEASUREMENTS_KEY,
} from '@/lib/paths/event-quick-check-page';
import type { WorkflowStepEmitter } from '@/lib/assistant/workflows/workflow-step-stream';

export type ContinueAfterDeepScanInput = {
  user: RequestUser;
  workflowRunId: string;
  emit?: WorkflowStepEmitter;
};

/** Resume Komplettscan after CHECKION domain-scan-all jobs finished. */
export async function continueEventQuickCheckAfterDeepScan(
  input: ContinueAfterDeepScanInput
): Promise<ExecuteEventQuickCheckRunResult> {
  const run = await getAssistantWorkflowRunById(input.workflowRunId);
  if (!run || !(await userCanAccessEventQuickCheckRun(input.user, run))) {
    throw new Error('NOT_FOUND');
  }

  const stored = run.result ?? {};
  if (!stored[EVENT_QUICK_CHECK_AWAITING_DEEP_SCAN_KEY] || !stored[EVENT_QUICK_CHECK_CHECKPOINT_KEY]) {
    throw new Error('DEEP_SCAN_NOT_AWAITING');
  }

  const geoConfirmed = stored[EVENT_QUICK_CHECK_GEO_QUESTIONS_CONFIRMED_KEY] as string[] | undefined;
  if (!geoConfirmed?.length) {
    throw new Error('GEO_NOT_CONFIRMED');
  }

  await updateAssistantWorkflowRun(run.id, {
    result: {
      ...stored,
      [EVENT_QUICK_CHECK_AWAITING_DEEP_SCAN_KEY]: false,
    },
  });

  return executeEventQuickCheckRun({
    user: input.user,
    workflowRunId: run.id,
    emit: input.emit,
    continueAfterDeepScan: true,
    geoQuestionsConfirmed: geoConfirmed,
    geoMeasurementsConfirmed: stored[EVENT_QUICK_CHECK_GEO_MEASUREMENTS_KEY] as
      | GeoMeasurement[]
      | undefined,
  });
}
