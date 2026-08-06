import { describe, expect, it } from 'vitest';
import { resolvePersonaPreviewForReport } from '@/lib/assistant/event-quick-check/persona-bootstrap-preview';

describe('resolvePersonaPreviewForReport', () => {
  it('prefers live personaPreview', () => {
    const preview = {
      projectId: 'p1',
      projectName: 'Acme',
      targetGroupId: 'tg',
      targetGroupName: 'TG',
      persona: {
        id: 'a',
        name: 'Anna',
        segment: 'S',
        confidence: 0.9,
        headline: 'H',
      },
    };
    expect(
      resolvePersonaPreviewForReport({
        personaPreview: preview,
        geoQuestionsByPersona: [
          { personaId: 'b', personaName: 'Ben', segment: 'S2', questions: ['Q'] },
        ],
      })?.persona?.name
    ).toBe('Anna');
  });

  it('recovers from persona_bootstrap outcome preview', () => {
    const preview = {
      projectId: 'p1',
      projectName: 'Acme',
      targetGroupId: 'tg',
      targetGroupName: 'TG',
      persona: {
        id: 'a',
        name: 'Anna',
        segment: 'S',
        confidence: 0.9,
        headline: 'H',
      },
    };
    expect(
      resolvePersonaPreviewForReport({
        outcomes: [{ stepId: 'persona_bootstrap', data: { preview } }],
      })?.persona?.name
    ).toBe('Anna');
  });

  it('synthesizes names from geo question groups when preview is missing', () => {
    const resolved = resolvePersonaPreviewForReport({
      projectName: 'Acme',
      geoQuestionsByPersona: [
        { personaId: 'a', personaName: 'Anna', segment: 'Entscheider', questions: ['Q1'] },
        { personaId: 'b', personaName: 'Ben', segment: 'Anwender', questions: ['Q2'] },
      ],
    });
    expect(resolved?.personas?.map((p) => p.name)).toEqual(['Anna', 'Ben']);
  });
});
