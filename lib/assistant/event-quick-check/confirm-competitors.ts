import type { RequestUser } from '@/lib/auth-request-user';
import { applyCompetitorEdits } from '@/lib/assistant/event-quick-check/apply-competitor-edits';
import {
  executeEventQuickCheckRun,
  type ExecuteEventQuickCheckRunResult,
} from '@/lib/assistant/event-quick-check/execute-event-quick-check-page';
import { updateCheckionProject } from '@/lib/integrations/checkion-project-competitors-client';
import { getAssistantWorkflowRunById, updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { userCanAccessEventQuickCheckRun } from '@/lib/assistant/event-quick-check/authorize-event-quick-check-run';
import type { EventQuickCheckCompetitorsCheckpoint } from '@/lib/assistant/event-quick-check/event-quick-check-checkpoint';
import {
  EVENT_QUICK_CHECK_AWAITING_COMPETITORS_KEY,
  EVENT_QUICK_CHECK_COMPETITORS_CHECKPOINT_KEY,
  EVENT_QUICK_CHECK_COMPETITORS_CONFIRMED_KEY,
  EVENT_QUICK_CHECK_COMPETITORS_DRAFT_KEY,
} from '@/lib/paths/event-quick-check-page';
import { resolveEventQuickCheckProfileFromStored } from '@/lib/paths/assistant-workflows';
import type { WorkflowStepEmitter } from '@/lib/assistant/workflows/workflow-step-stream';

export type ConfirmCompetitorsInput = {
  user: RequestUser;
  workflowRunId: string;
  competitors?: string[];
  emit?: WorkflowStepEmitter;
};

export async function confirmEventQuickCheckCompetitors(
  input: ConfirmCompetitorsInput
): Promise<ExecuteEventQuickCheckRunResult> {
  const run = await getAssistantWorkflowRunById(input.workflowRunId);
  if (!run || !(await userCanAccessEventQuickCheckRun(input.user, run))) {
    throw new Error('NOT_FOUND');
  }

  const stored = run.result ?? {};
  const draft = (stored[EVENT_QUICK_CHECK_COMPETITORS_DRAFT_KEY] as string[] | undefined) ?? [];
  const checkpoint = stored[EVENT_QUICK_CHECK_COMPETITORS_CHECKPOINT_KEY] as
    | EventQuickCheckCompetitorsCheckpoint
    | undefined;

  if (!checkpoint || !stored[EVENT_QUICK_CHECK_AWAITING_COMPETITORS_KEY]) {
    throw new Error('COMPETITORS_NOT_AWAITING');
  }

  const profile = resolveEventQuickCheckProfileFromStored(stored);
  const confirmed = applyCompetitorEdits(draft, { competitors: input.competitors }, profile.maxCompetitors);

  const patched = await updateCheckionProject({
    projectId: checkpoint.checkionProjectId,
    competitors: confirmed,
    domain: checkpoint.url,
  });
  if (!patched.ok) {
    throw new Error(patched.error);
  }

  const steps = run.steps.map((s) =>
    s.id === 'competitors_confirm'
      ? { ...s, status: 'done' as const, detail: `${confirmed.length} Wettbewerber gespeichert` }
      : s
  );

  await updateAssistantWorkflowRun(run.id, {
    steps,
    result: {
      ...stored,
      [EVENT_QUICK_CHECK_COMPETITORS_CONFIRMED_KEY]: confirmed,
      [EVENT_QUICK_CHECK_AWAITING_COMPETITORS_KEY]: false,
    },
  });

  return executeEventQuickCheckRun({
    user: input.user,
    workflowRunId: run.id,
    emit: input.emit,
    competitorsConfirmed: confirmed,
  });
}
