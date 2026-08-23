import type { RequestUser } from '@/lib/auth-request-user';
import { applyGeoQuestionEdits, maxGeoQuestionsForProfile } from '@/lib/assistant/event-quick-check/apply-geo-question-edits';
import {
  executeEventQuickCheckRun,
  type ExecuteEventQuickCheckRunResult,
} from '@/lib/assistant/event-quick-check/execute-event-quick-check-page';
import { getAssistantWorkflowRunById, updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { userCanAccessEventQuickCheckRun } from '@/lib/assistant/event-quick-check/authorize-event-quick-check-run';
import type { EventQuickCheckResumeCheckpoint } from '@/lib/assistant/event-quick-check/event-quick-check-checkpoint';
import type { PersonaGeoQuestionGroup } from '@/lib/assistant/geo/build-persona-geo-questions';
import {
  EVENT_QUICK_CHECK_AWAITING_GEO_QUESTIONS_KEY,
  EVENT_QUICK_CHECK_CHECKPOINT_KEY,
  EVENT_QUICK_CHECK_GEO_COMPETITORS_DRAFT_KEY,
  EVENT_QUICK_CHECK_GEO_QUESTIONS_BY_PERSONA_DRAFT_KEY,
  EVENT_QUICK_CHECK_GEO_QUESTIONS_CONFIRMED_KEY,
  EVENT_QUICK_CHECK_GEO_QUESTIONS_DRAFT_KEY,
  EVENT_QUICK_CHECK_GEO_MEASUREMENTS_KEY,
} from '@/lib/paths/event-quick-check-page';
import { parseGeoMeasurementsOrDefaultEqc, type GeoMeasurement } from '@/lib/geo/measurement';
import { resolveEventQuickCheckProfileFromStored } from '@/lib/paths/assistant-workflows';
import type { WorkflowStepEmitter } from '@/lib/assistant/workflows/workflow-step-stream';

export type ConfirmGeoQuestionsInput = {
  user: RequestUser;
  workflowRunId: string;
  questions?: string[];
  groups?: PersonaGeoQuestionGroup[];
  measurements?: GeoMeasurement[];
  emit?: WorkflowStepEmitter;
};

export type PersistGeoQuestionsConfirmationResult = {
  workflowRunId: string;
  geoQuestionsConfirmed: string[];
  geoCompetitorsConfirmed?: string[];
  geoMeasurementsConfirmed: GeoMeasurement[];
  emit?: WorkflowStepEmitter;
};

/** DB + step updates only — safe to return HTTP 202 before execute. */
export async function persistGeoQuestionsConfirmation(
  input: ConfirmGeoQuestionsInput
): Promise<PersistGeoQuestionsConfirmationResult> {
  const run = await getAssistantWorkflowRunById(input.workflowRunId);
  if (!run || !(await userCanAccessEventQuickCheckRun(input.user, run))) {
    throw new Error('NOT_FOUND');
  }

  const stored = run.result ?? {};
  const draft = stored[EVENT_QUICK_CHECK_GEO_QUESTIONS_DRAFT_KEY] as string[] | undefined;
  const checkpoint = stored[EVENT_QUICK_CHECK_CHECKPOINT_KEY] as
    | EventQuickCheckResumeCheckpoint
    | undefined;

  if (!draft?.length || !checkpoint || !stored[EVENT_QUICK_CHECK_AWAITING_GEO_QUESTIONS_KEY]) {
    throw new Error('GEO_NOT_AWAITING');
  }

  const profile = resolveEventQuickCheckProfileFromStored(stored);
  const confirmedQuestions = applyGeoQuestionEdits(draft, { questions: input.questions }, {
    maxQuestions: maxGeoQuestionsForProfile(profile.personaCount, profile.geoQuestionsPerPersona),
  });
  const competitors =
    (stored[EVENT_QUICK_CHECK_GEO_COMPETITORS_DRAFT_KEY] as string[] | undefined) ??
    checkpoint.geoCompetitors;

  const confirmedGroups = input.groups?.length
    ? input.groups.map((g) => ({
        ...g,
        questions: g.questions.map((q) => q.trim()).filter(Boolean),
      }))
    : undefined;

  const steps = run.steps.map((s) =>
    s.id === 'geo_questions_confirm'
      ? { ...s, status: 'done' as const, detail: `${confirmedQuestions.length} Fragen bestätigt` }
      : s.id === 'geo_check'
        ? { ...s, status: 'pending' as const, detail: 'GEO wird neu gestartet…', progress: 0 }
        : s
  );

  const {
    [EVENT_QUICK_CHECK_GEO_QUESTIONS_BY_PERSONA_DRAFT_KEY]: _priorGroups,
    ...storedWithoutGroups
  } = stored;

  await updateAssistantWorkflowRun(run.id, {
    status: 'running',
    steps,
    result: {
      ...storedWithoutGroups,
      [EVENT_QUICK_CHECK_GEO_QUESTIONS_CONFIRMED_KEY]: confirmedQuestions,
      [EVENT_QUICK_CHECK_GEO_QUESTIONS_DRAFT_KEY]: confirmedQuestions,
      ...(confirmedGroups?.length
        ? { [EVENT_QUICK_CHECK_GEO_QUESTIONS_BY_PERSONA_DRAFT_KEY]: confirmedGroups }
        : {}),
      [EVENT_QUICK_CHECK_AWAITING_GEO_QUESTIONS_KEY]: false,
      [EVENT_QUICK_CHECK_GEO_MEASUREMENTS_KEY]: parseGeoMeasurementsOrDefaultEqc(input.measurements),
    },
  });

  return {
    workflowRunId: run.id,
    geoQuestionsConfirmed: confirmedQuestions,
    geoCompetitorsConfirmed: competitors,
    geoMeasurementsConfirmed: parseGeoMeasurementsOrDefaultEqc(input.measurements),
    emit: input.emit,
  };
}

export async function confirmEventQuickCheckGeoQuestions(
  input: ConfirmGeoQuestionsInput
): Promise<ExecuteEventQuickCheckRunResult> {
  const prep = await persistGeoQuestionsConfirmation(input);
  return executeEventQuickCheckRun({
    user: input.user,
    workflowRunId: prep.workflowRunId,
    emit: prep.emit,
    geoQuestionsConfirmed: prep.geoQuestionsConfirmed,
    geoCompetitorsConfirmed: prep.geoCompetitorsConfirmed,
    geoMeasurementsConfirmed: prep.geoMeasurementsConfirmed,
  });
}
