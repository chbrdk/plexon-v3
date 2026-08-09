import { describe, expect, it } from 'vitest';
import {
  buildPersonaGeoQuestionContext,
  collectForbiddenBrandTerms,
  isNaturalPersonaGeoQuestion,
  sanitizePersonaGeoQuestions,
} from '@/lib/assistant/geo/synthesize-persona-geo-questions';

describe('synthesize-persona-geo-questions', () => {
  it('rejects metadata-stuffed questions', () => {
    expect(
      isNaturalPersonaGeoQuestion(
        'Top Logistik — Branche: Etiketten — Zielgruppe: Einkäufer — Bezug: Schreiner'
      )
    ).toBe(false);
    expect(
      isNaturalPersonaGeoQuestion(
        'Welche temperaturbeständigen Etiketten eignen sich für Automotive-Innenraumteile?'
      )
    ).toBe(true);
  });

  it('sanitizes and deduplicates questions and drops brand mentions', () => {
    const forbidden = collectForbiddenBrandTerms('https://www.schreiner-group.com', {
      displayName: 'Schreiner Group',
      industry: 'Etiketten',
      summary: '…',
      targetAudienceHint: '…',
      disambiguationNote: '…',
      companyContext: '…',
      sources: { url: 'https://www.schreiner-group.com', domain: 'schreiner-group.com', h1: [] },
      generatedAt: new Date().toISOString(),
    });

    const result = sanitizePersonaGeoQuestions(
      [
        'Ist Schreiner Group eine gute Wahl für RFID-Etiketten?',
        'Ist Schreiner Group eine gute Wahl für RFID-Etiketten?',
        'Branche: Test — Zielgruppe: Test',
        'Wer sind Alternativen zu Schreiner für Pharma-Etiketten?',
        'Welche Anbieter für Pharma-Etiketten sollte ich vergleichen?',
      ],
      3,
      { forbiddenBrandTerms: forbidden }
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('Pharma-Etiketten');
    expect(result[0].toLowerCase()).not.toContain('schreiner');
  });

  it('builds persona context without prompting to name the brand', () => {
    const context = buildPersonaGeoQuestionContext({
      url: 'https://www.schreiner-group.com',
      persona: {
        id: 'p1',
        name: 'Lisa',
        segment: 'Produktmanager Verpackung',
        confidence: 0.9,
        headline: 'Sucht zuverlässige Etiketten-Lieferanten',
        profile: {
          traits: [],
          goals: ['Lieferanten für Pharma-Etiketten vergleichen'],
          painPoints: ['Hohe Mindestbestellmengen'],
        },
      },
      companyBrief: {
        displayName: 'Schreiner Group',
        industry: 'Etiketten- & Funktionslabel-Hersteller',
        summary: 'Spezialist für technische Etiketten.',
        targetAudienceHint: 'Einkäufer in Pharma und Automotive',
        disambiguationNote: 'Kein Schreinerhandwerk',
        companyContext: '…',
        sources: { url: 'https://www.schreiner-group.com', domain: 'schreiner-group.com', h1: [] },
        generatedAt: new Date().toISOString(),
      },
      checkionQueryHints: ['Top Logistikdienstleister Luftfracht'],
    });

    expect(context).toContain('Lisa');
    expect(context).toContain('Hohe Mindestbestellmengen');
    expect(context).toContain('NICHT übernehmen');
    expect(context).toContain('Verbotene Namen');
    expect(context).not.toContain('Branche:');
    expect(context).not.toContain('Bewertetes Unternehmen:');
  });
});
