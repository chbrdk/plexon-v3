import { describe, expect, it } from 'vitest';
import {
  canReopenEventQuickCheckGeo,
  resolveGeoQuestionsReopenDraft,
} from '@/lib/assistant/event-quick-check/resolve-geo-questions-reopen-draft';
import {
  EVENT_QUICK_CHECK_CHECKPOINT_KEY,
  EVENT_QUICK_CHECK_GEO_QUESTIONS_BY_PERSONA_DRAFT_KEY,
  EVENT_QUICK_CHECK_GEO_QUESTIONS_CONFIRMED_KEY,
  EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY,
} from '@/lib/paths/event-quick-check-page';
import type { EventQuickCheckResumeCheckpoint } from '@/lib/assistant/event-quick-check/event-quick-check-checkpoint';

const checkpoint: EventQuickCheckResumeCheckpoint = {
  projectName: 'Acme',
  url: 'https://acme.de',
  outcomes: [],
  geoCompetitors: ['rival.de'],
};

describe('resolveGeoQuestionsReopenDraft', () => {
  it('prefers persona groups when present', () => {
    const draft = resolveGeoQuestionsReopenDraft({
      [EVENT_QUICK_CHECK_GEO_QUESTIONS_BY_PERSONA_DRAFT_KEY]: [
        {
          personaId: 'a',
          personaName: 'Anna',
          segment: 'B2B',
          questions: ['Q1', 'Q2'],
        },
      ],
      [EVENT_QUICK_CHECK_GEO_QUESTIONS_CONFIRMED_KEY]: ['ignored'],
    });
    expect(draft?.questions).toEqual(['Q1', 'Q2']);
    expect(draft?.groups).toHaveLength(1);
  });

  it('falls back to confirmed questions', () => {
    const draft = resolveGeoQuestionsReopenDraft({
      [EVENT_QUICK_CHECK_GEO_QUESTIONS_CONFIRMED_KEY]: ['A', 'B'],
    });
    expect(draft?.questions).toEqual(['A', 'B']);
    expect(draft?.groups).toBeUndefined();
  });

  it('canRerunGeo requires checkpoint + report + questions', () => {
    expect(canReopenEventQuickCheckGeo({})).toBe(false);
    expect(
      canReopenEventQuickCheckGeo({
        [EVENT_QUICK_CHECK_CHECKPOINT_KEY]: checkpoint,
        [EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY]: {
          geo: { questions: ['Q'], status: 'complete' },
        },
        [EVENT_QUICK_CHECK_GEO_QUESTIONS_CONFIRMED_KEY]: ['Q'],
      })
    ).toBe(true);
  });
});
