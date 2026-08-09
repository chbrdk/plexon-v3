import type { RequestUser } from '@/lib/auth-request-user';
import {
  canReopenEventQuickCheckGeo,
  resolveGeoQuestionsReopenDraft,
} from '@/lib/assistant/event-quick-check/resolve-geo-questions-reopen-draft';
import type { EventQuickCheckResumeCheckpoint } from '@/lib/assistant/event-quick-check/event-quick-check-checkpoint';
import type { PersonaGeoQuestionGroup } from '@/lib/assistant/geo/build-persona-geo-questions';
import { getAssistantWorkflowRunById, updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { userCanAccessEventQuickCheckRun } from '@/lib/assistant/event-quick-check/authorize-event-quick-check-run';
import {
  EVENT_QUICK_CHECK_AWAITING_GEO_QUESTIONS_KEY,
  EVENT_QUICK_CHECK_CHECKPOINT_KEY,
  EVENT_QUICK_CHECK_GEO_COMPETITORS_DRAFT_KEY,
  EVENT_QUICK_CHECK_GEO_QUESTIONS_BY_PERSONA_DRAFT_KEY,
  EVENT_QUICK_CHECK_GEO_QUESTIONS_DRAFT_KEY,
  EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY,
} from '@/lib/paths/event-quick-check-page';

export type ReopenGeoQuestionsInput = {
  user: RequestUser;
  workflowRunId: string;
};

export type ReopenGeoQuestionsResult = {
  ok: true;
  workflowRunId: string;
  awaitingGeoQuestions: true;
  geoQuestions: string[];
  geoQuestionsByPersona?: PersonaGeoQuestionGroup[];
  geoCompetitors?: string[];
};

/** Re-open GEO question gate after a completed Quick Check (reuse checkpoint, no rescan). */
export async function reopenEventQuickCheckGeoQuestions(
  input: ReopenGeoQuestionsInput
): Promise<ReopenGeoQuestionsResult> {
  const run = await getAssistantWorkflowRunById(input.workflowRunId);
  if (!run || !(await userCanAccessEventQuickCheckRun(input.user, run))) {
    throw new Error('NOT_FOUND');
  }
  if (run.type !== 'event_quick_check') {
    throw new Error('INVALID_RUN');
  }

  const stored = run.result ?? {};
  if (!canReopenEventQuickCheckGeo(stored)) {
    throw new Error('GEO_REOPEN_UNAVAILABLE');
  }

  const draft = resolveGeoQuestionsReopenDraft(stored);
  if (!draft?.questions.length) {
    throw new Error('GEO_REOPEN_UNAVAILABLE');
  }

  const checkpoint = stored[EVENT_QUICK_CHECK_CHECKPOINT_KEY] as EventQuickCheckResumeCheckpoint;

  await updateAssistantWorkflowRun(run.id, {
    status: 'running',
    result: {
      ...stored,
      [EVENT_QUICK_CHECK_AWAITING_GEO_QUESTIONS_KEY]: true,
      [EVENT_QUICK_CHECK_GEO_QUESTIONS_DRAFT_KEY]: draft.questions,
      ...(draft.groups?.length
        ? { [EVENT_QUICK_CHECK_GEO_QUESTIONS_BY_PERSONA_DRAFT_KEY]: draft.groups }
        : {}),
      [EVENT_QUICK_CHECK_GEO_COMPETITORS_DRAFT_KEY]:
        (stored[EVENT_QUICK_CHECK_GEO_COMPETITORS_DRAFT_KEY] as string[] | undefined) ??
        checkpoint.geoCompetitors ??
        [],
    },
  });

  return {
    ok: true,
    workflowRunId: run.id,
    awaitingGeoQuestions: true,
    geoQuestions: draft.questions,
    geoQuestionsByPersona: draft.groups,
    geoCompetitors:
      (stored[EVENT_QUICK_CHECK_GEO_COMPETITORS_DRAFT_KEY] as string[] | undefined) ??
      checkpoint.geoCompetitors,
  };
}

export type CancelGeoReopenInput = {
  user: RequestUser;
  workflowRunId: string;
};

/** Abort GEO reopen and restore completed report view. */
export async function cancelEventQuickCheckGeoReopen(
  input: CancelGeoReopenInput
): Promise<{ ok: true; workflowRunId: string }> {
  const run = await getAssistantWorkflowRunById(input.workflowRunId);
  if (!run || !(await userCanAccessEventQuickCheckRun(input.user, run))) {
    throw new Error('NOT_FOUND');
  }

  const stored = run.result ?? {};
  if (!stored[EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY]) {
    throw new Error('NO_REPORT');
  }
  if (!stored[EVENT_QUICK_CHECK_AWAITING_GEO_QUESTIONS_KEY]) {
    return { ok: true, workflowRunId: run.id };
  }

  await updateAssistantWorkflowRun(run.id, {
    status: 'completed',
    result: {
      ...stored,
      [EVENT_QUICK_CHECK_AWAITING_GEO_QUESTIONS_KEY]: false,
    },
  });

  return { ok: true, workflowRunId: run.id };
}
