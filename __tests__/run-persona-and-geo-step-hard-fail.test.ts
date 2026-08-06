import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/integrations/audion-persona-bootstrap-client', () => ({
  runPersonaBootstrap: vi.fn(async () => ({
    ok: false as const,
    error: 'AUDION unreachable',
  })),
  runMultiPersonaBootstrap: vi.fn(async () => ({
    ok: false as const,
    error: 'AUDION unreachable',
  })),
}));

vi.mock('@/lib/assistant/geo/build-persona-geo-questions', () => ({
  buildPersonaGeoQuestions: vi.fn(),
  buildMultiPersonaGeoQuestions: vi.fn(),
  buildGeoQuestionsWithoutPersona: vi.fn(async () => {
    throw new Error('fallback must not run');
  }),
}));

import { runPersonaAndGeoQuestionsStep } from '@/lib/assistant/event-quick-check/run-persona-and-geo-step';
import { resolveEventQuickCheckProfile } from '@/lib/paths/assistant-workflows';

describe('runPersonaAndGeoQuestionsStep hard fail', () => {
  it('does not invent GEO questions when AUDION persona bootstrap fails', async () => {
    const result = await runPersonaAndGeoQuestionsStep({
      profile: resolveEventQuickCheckProfile('quick'),
      projectName: 'Acme',
      url: 'https://example.com',
      geoCompetitors: [],
      companyBrief: {
        displayName: 'Acme',
        industry: 'Software',
        summary: 'B2B SaaS',
        targetAudience: 'IT buyers',
      },
    });

    expect(result.geoQuestions).toEqual([]);
    expect(result.personaOutcome.status).toBe('error');
    expect(result.geoOutcome.status).toBe('error');
    expect(result.audionSetupRequired).toBe(true);
    expect(result.geoOutcome.data).toMatchObject({ personaMissing: true });
  });
});
