import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types';
import type { PersonaGeoQuestionGroup } from '@/lib/assistant/geo/build-persona-geo-questions';
import type { EventQuickCheckResumeCheckpoint } from '@/lib/assistant/event-quick-check/event-quick-check-checkpoint';
import {
  EVENT_QUICK_CHECK_CHECKPOINT_KEY,
  EVENT_QUICK_CHECK_GEO_QUESTIONS_BY_PERSONA_DRAFT_KEY,
  EVENT_QUICK_CHECK_GEO_QUESTIONS_CONFIRMED_KEY,
  EVENT_QUICK_CHECK_GEO_QUESTIONS_DRAFT_KEY,
  EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY,
} from '@/lib/paths/event-quick-check-page';

export type GeoQuestionsReopenDraft = {
  questions: string[];
  groups?: PersonaGeoQuestionGroup[];
};

/** Build editable GEO draft from stored run state / completed report. */
export function resolveGeoQuestionsReopenDraft(
  stored: Record<string, unknown>
): GeoQuestionsReopenDraft | null {
  const report = stored[EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY] as
    | EventQuickCheckReportModel
    | undefined;

  const groupsDraft = stored[EVENT_QUICK_CHECK_GEO_QUESTIONS_BY_PERSONA_DRAFT_KEY] as
    | PersonaGeoQuestionGroup[]
    | undefined;
  if (groupsDraft?.length) {
    const questions = groupsDraft.flatMap((g) => g.questions.map((q) => q.trim()).filter(Boolean));
    if (questions.length) return { questions, groups: groupsDraft };
  }

  if (report?.personas?.some((p) => p.geoQuestions?.length)) {
    const groups: PersonaGeoQuestionGroup[] = report.personas
      .map((p) => ({
        personaId: p.id,
        personaName: p.name,
        segment: p.segment,
        questions: (p.geoQuestions ?? []).map((q) => q.trim()).filter(Boolean),
      }))
      .filter((g) => g.questions.length > 0);
    const questions = groups.flatMap((g) => g.questions);
    if (questions.length) return { questions, groups };
  }

  const draft = stored[EVENT_QUICK_CHECK_GEO_QUESTIONS_DRAFT_KEY] as string[] | undefined;
  const confirmed = stored[EVENT_QUICK_CHECK_GEO_QUESTIONS_CONFIRMED_KEY] as string[] | undefined;
  const fromReport = report?.geo?.questions;
  const questions = (draft?.length ? draft : confirmed?.length ? confirmed : fromReport ?? [])
    .map((q) => q.trim())
    .filter(Boolean);

  if (!questions.length) return null;
  return { questions };
}

export function canReopenEventQuickCheckGeo(stored: Record<string, unknown>): boolean {
  const checkpoint = stored[EVENT_QUICK_CHECK_CHECKPOINT_KEY] as
    | EventQuickCheckResumeCheckpoint
    | undefined;
  if (!checkpoint) return false;
  if (!stored[EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY]) return false;
  return Boolean(resolveGeoQuestionsReopenDraft(stored)?.questions.length);
}
