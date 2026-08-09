import { describe, expect, it, vi, beforeEach } from 'vitest';
import { buildPersonaGeoQuestions } from '@/lib/assistant/geo/build-persona-geo-questions';

vi.mock('@/lib/integrations/checkion-geo-client', () => ({
  suggestCheckionGeoQueries: vi.fn(),
}));

vi.mock('@/lib/integrations/audion-persona-geo-questions-client', () => ({
  fetchAudionPersonaGeoQuestions: vi.fn(),
  isAudionPersonaUuid: (id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id),
}));

vi.mock('@/lib/assistant/geo/synthesize-persona-geo-questions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/assistant/geo/synthesize-persona-geo-questions')>();
  return {
    ...actual,
    synthesizePersonaGeoQuestions: vi.fn(),
    synthesizeCompanyBriefGeoQuestions: vi.fn(),
  };
});

import { suggestCheckionGeoQueries } from '@/lib/integrations/checkion-geo-client';
import { fetchAudionPersonaGeoQuestions } from '@/lib/integrations/audion-persona-geo-questions-client';
import { synthesizePersonaGeoQuestions } from '@/lib/assistant/geo/synthesize-persona-geo-questions';

const persona = {
  id: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
  name: 'Lisa',
  segment: 'Produktmanager Verpackung',
  confidence: 0.82,
  headline: 'Sucht zuverlässige Etiketten-Lieferanten',
  profile: {
    traits: [],
    goals: ['Pharma-Etiketten vergleichen'],
    painPoints: ['Hohe Mindestbestellmengen'],
  },
};

describe('buildPersonaGeoQuestions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses AUDION persona geo-questions when persona has a real UUID', async () => {
    vi.mocked(suggestCheckionGeoQueries).mockResolvedValue({
      ok: true,
      queries: ['Top Logistikdienstleister für Luftfracht Anbieter Empfehlung'],
      competitors: ['dhl.com'],
    });
    vi.mocked(fetchAudionPersonaGeoQuestions).mockResolvedValue({
      ok: true,
      questions: [
        'Ich brauche temperaturbeständige Etiketten für Automotive — wen soll ich vergleichen?',
        'Welche Anbieter für Pharma-Kennzeichnung empfiehlst du?',
        'Wer liefert kleinere Losgrößen bei Funktionsetiketten in Deutschland?',
      ],
    });

    const result = await buildPersonaGeoQuestions({
      url: 'https://www.schreiner-group.com',
      persona,
      count: 3,
    });

    expect(result.source).toBe('audion_persona');
    expect(result.questions[0]).not.toContain('Luftfracht');
    expect(fetchAudionPersonaGeoQuestions).toHaveBeenCalledWith(
      expect.objectContaining({ personaId: persona.id })
    );
    expect(fetchAudionPersonaGeoQuestions).toHaveBeenCalledWith(
      expect.not.objectContaining({ brandName: expect.anything() })
    );
    expect(synthesizePersonaGeoQuestions).not.toHaveBeenCalled();
  });

  it('uses PLEXON LLM fallback when AUDION returns no questions', async () => {
    vi.mocked(suggestCheckionGeoQueries).mockResolvedValue({
      ok: true,
      queries: ['Top Logistikdienstleister für Luftfracht Anbieter Empfehlung'],
      competitors: ['dhl.com'],
    });
    vi.mocked(fetchAudionPersonaGeoQuestions).mockResolvedValue({
      ok: false,
      error: 'HTTP 503',
    });
    vi.mocked(synthesizePersonaGeoQuestions).mockResolvedValue([
      'Ich brauche temperaturbeständige Etiketten für Automotive — wen soll ich vergleichen?',
      'Welche Anbieter für Pharma-Kennzeichnung empfiehlst du?',
      'Wer liefert kleinere Losgrößen bei Funktionsetiketten in Deutschland?',
    ]);

    const result = await buildPersonaGeoQuestions({
      url: 'https://www.schreiner-group.com',
      persona,
      count: 3,
    });

    expect(result.source).toBe('persona_llm');
    expect(result.questions[0]).not.toContain('Branche:');
    expect(result.questions[0]).not.toContain('Luftfracht');
    expect(result.competitors).toEqual(['dhl.com']);
    expect(synthesizePersonaGeoQuestions).toHaveBeenCalledWith(
      expect.objectContaining({
        checkionQueryHints: ['Top Logistikdienstleister für Luftfracht Anbieter Empfehlung'],
      })
    );
  });

  it('falls back to natural persona templates when LLM unavailable', async () => {
    vi.mocked(suggestCheckionGeoQueries).mockResolvedValue({
      ok: false,
      error: 'HTTP 503',
    });
    vi.mocked(fetchAudionPersonaGeoQuestions).mockResolvedValue({
      ok: false,
      error: 'HTTP 503',
    });
    vi.mocked(synthesizePersonaGeoQuestions).mockResolvedValue(null);

    const result = await buildPersonaGeoQuestions({
      url: 'https://www.schreiner-group.com',
      persona,
      companyBrief: {
        displayName: 'Schreiner Group',
        industry: 'Etikettenhersteller',
        summary: 'Technische Etiketten',
        targetAudienceHint: 'Einkäufer Pharma',
        disambiguationNote: 'Kein Handwerk',
        companyContext: '…',
        sources: { url: 'https://www.schreiner-group.com', domain: 'schreiner-group.com', h1: [] },
        generatedAt: new Date().toISOString(),
      },
      count: 3,
    });

    expect(result.source).toBe('persona_fallback');
    expect(result.questions.join(' ').toLowerCase()).not.toContain('schreiner');
    expect(result.questions.join(' ')).toContain('Etiketten');
    expect(result.questions.join(' ')).not.toContain('Branche:');
    expect(result.suggestError).toBe('HTTP 503');
  });
});
