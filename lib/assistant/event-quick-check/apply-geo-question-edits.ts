const MIN_GEO_QUESTIONS = 1;
const MAX_QUESTION_LENGTH = 500;
const DEFAULT_MAX_GEO_QUESTIONS = 8;

/** Normalize user-edited GEO questions before CHECKION LLM run. */
export function applyGeoQuestionEdits(
  draft: string[],
  edits?: { questions?: string[] },
  options?: { maxQuestions?: number }
): string[] {
  const maxQuestions = options?.maxQuestions ?? DEFAULT_MAX_GEO_QUESTIONS;
  const source = edits?.questions ?? draft;
  const cleaned = source
    .map((q) => q.trim())
    .filter(Boolean)
    .slice(0, maxQuestions);

  if (cleaned.length < MIN_GEO_QUESTIONS) {
    const fallback = draft.map((q) => q.trim()).filter(Boolean);
    if (fallback.length >= MIN_GEO_QUESTIONS) return fallback.slice(0, maxQuestions);
    throw new Error('GEO_QUESTIONS_EMPTY');
  }

  return cleaned.map((q) => q.slice(0, MAX_QUESTION_LENGTH));
}

export function maxGeoQuestionsForProfile(personaCount: number, questionsPerPersona: number): number {
  return Math.max(DEFAULT_MAX_GEO_QUESTIONS, personaCount * questionsPerPersona);
}
