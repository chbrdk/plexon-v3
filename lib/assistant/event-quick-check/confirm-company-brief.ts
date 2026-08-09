import type { RequestUser } from '@/lib/auth-request-user';
import type { EventQuickCheckCompanyBrief } from '@/lib/assistant/event-quick-check/company-brief-types';
import { applyCompanyBriefEdits } from '@/lib/assistant/event-quick-check/research-company-brief';
import {
  executeEventQuickCheckRun,
  type ExecuteEventQuickCheckRunResult,
} from '@/lib/assistant/event-quick-check/execute-event-quick-check-page';
import { getAssistantWorkflowRunById, updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { userCanAccessEventQuickCheckRun } from '@/lib/assistant/event-quick-check/authorize-event-quick-check-run';
import {
  EVENT_QUICK_CHECK_AWAITING_COMPANY_BRIEF_KEY,
  EVENT_QUICK_CHECK_COMPANY_BRIEF_CONFIRMED_KEY,
  EVENT_QUICK_CHECK_COMPANY_BRIEF_KEY,
} from '@/lib/paths/event-quick-check-page';
import type { WorkflowStepEmitter } from '@/lib/assistant/workflows/workflow-step-stream';

export type ConfirmCompanyBriefInput = {
  user: RequestUser;
  workflowRunId: string;
  displayName?: string;
  industry?: string;
  summary?: string;
  targetAudienceHint?: string;
  disambiguationNote?: string;
  emit?: WorkflowStepEmitter;
};

export async function confirmEventQuickCheckCompanyBrief(
  input: ConfirmCompanyBriefInput
): Promise<ExecuteEventQuickCheckRunResult> {
  const run = await getAssistantWorkflowRunById(input.workflowRunId);
  if (!run || !(await userCanAccessEventQuickCheckRun(input.user, run))) {
    throw new Error('NOT_FOUND');
  }

  const stored = run.result ?? {};
  const draft = stored[EVENT_QUICK_CHECK_COMPANY_BRIEF_KEY] as EventQuickCheckCompanyBrief | undefined;
  if (!draft || !stored[EVENT_QUICK_CHECK_AWAITING_COMPANY_BRIEF_KEY]) {
    throw new Error('BRIEF_NOT_AWAITING');
  }

  const confirmed = applyCompanyBriefEdits(draft, {
    displayName: input.displayName,
    industry: input.industry,
    summary: input.summary,
    targetAudienceHint: input.targetAudienceHint,
    disambiguationNote: input.disambiguationNote,
  });

  const steps = run.steps.map((s) =>
    s.id === 'company_brief_confirm'
      ? { ...s, status: 'done' as const, detail: 'Bestätigt' }
      : s
  );

  await updateAssistantWorkflowRun(run.id, {
    steps,
    result: {
      ...stored,
      projectName: confirmed.displayName,
      [EVENT_QUICK_CHECK_COMPANY_BRIEF_CONFIRMED_KEY]: confirmed,
      [EVENT_QUICK_CHECK_AWAITING_COMPANY_BRIEF_KEY]: false,
    },
  });

  return executeEventQuickCheckRun({
    user: input.user,
    workflowRunId: run.id,
    emit: input.emit,
    companyBriefConfirmed: confirmed,
  });
}
