import { describe, expect, it } from 'vitest';
import { applyGeoQuestionEdits, maxGeoQuestionsForProfile } from '@/lib/assistant/event-quick-check/apply-geo-question-edits';

describe('applyGeoQuestionEdits', () => {
  it('trims and filters empty questions', () => {
    const next = applyGeoQuestionEdits(['  Q1  ', '', 'Q2'], {
      questions: ['  Q1  ', ' Neue Frage ', ''],
    });
    expect(next).toEqual(['Q1', 'Neue Frage']);
  });

  it('falls back to draft when edited list is empty', () => {
    expect(applyGeoQuestionEdits(['Q1'], { questions: ['', '  '] })).toEqual(['Q1']);
  });

  it('throws when no questions remain', () => {
    expect(() => applyGeoQuestionEdits([], { questions: ['', '  '] })).toThrow('GEO_QUESTIONS_EMPTY');
  });

  it('allows up to nine questions for complete scan profile', () => {
    const draft = Array.from({ length: 9 }, (_, i) => `Frage ${i + 1}`);
    const next = applyGeoQuestionEdits(draft, { questions: draft }, { maxQuestions: maxGeoQuestionsForProfile(3, 3) });
    expect(next).toHaveLength(9);
  });
});
