import { describe, expect, it } from 'vitest';
import {
  buildPersonaGeoQuestionContext,
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

  it('sanitizes and deduplicates questions', () => {
    const result = sanitizePersonaGeoQuestions(
      [
        'Ist Schreiner Group eine gute Wahl für RFID-Etiketten?',
        'Ist Schreiner Group eine gute Wahl für RFID-Etiketten?',
        'Branche: Test — Zielgruppe: Test',
        'Wer sind Alternativen zu Schreiner für Pharma-Etiketten?',
      ],
      3
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toContain('Schreiner');
  });

  it('builds rich persona context for LLM', () => {
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
    expect(context).not.toContain('Branche:');
  });
});
