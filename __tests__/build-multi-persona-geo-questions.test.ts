import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/assistant/geo/build-persona-geo-questions', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/assistant/geo/build-persona-geo-questions')>();
  return {
    ...original,
    buildPersonaGeoQuestions: vi.fn(async ({ persona, count }: { persona: { id: string; name: string; segment: string }; count?: number }) => ({
      questions: [`Q-${persona.name}-1`, `Q-${persona.name}-2`].slice(0, count ?? 2),
      competitors: ['rival.de'],
      source: 'persona_llm' as const,
    })),
  };
});

import { buildMultiPersonaGeoQuestions } from '@/lib/assistant/geo/build-persona-geo-questions';

describe('buildMultiPersonaGeoQuestions', () => {
  it('builds grouped and flat questions per persona', async () => {
    const result = await buildMultiPersonaGeoQuestions({
      url: 'https://acme.de',
      personas: [
        { id: '1', name: 'Anna', segment: 'Entscheider', confidence: 0.9, headline: 'H1' },
        { id: '2', name: 'Ben', segment: 'Anwender', confidence: 0.8, headline: 'H2' },
      ],
      questionsPerPersona: 2,
    });

    expect(result.groups).toHaveLength(2);
    expect(result.questions).toHaveLength(4);
    expect(result.groups[0].personaName).toBe('Anna');
    expect(result.groups[1].personaName).toBe('Ben');
    expect(result.questions.length).toBeGreaterThan(0);
  });
});
