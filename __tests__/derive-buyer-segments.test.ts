import { describe, expect, it } from 'vitest';
import { fallbackBuyerSegments } from '@/lib/assistant/event-quick-check/derive-buyer-segments';
import { EVENT_QUICK_CHECK_COMPANY_BRIEF_DISAMBIGUATION_DE } from '@/lib/assistant/event-quick-check/company-brief-types';

const sampleBrief = {
  displayName: 'Acme GmbH',
  industry: 'Industrielle Automatisierung',
  summary: 'Acme liefert Steuerungssoftware für Fertigungslinien.',
  targetAudienceHint: 'Produktionsleiter und Einkäufer in der Fertigung',
  disambiguationNote: EVENT_QUICK_CHECK_COMPANY_BRIEF_DISAMBIGUATION_DE,
  companyContext: 'ctx',
  sources: {
    url: 'https://acme.de',
    domain: 'acme.de',
    h1: ['Software für Fertigung'],
  },
  generatedAt: '2026-06-15T00:00:00.000Z',
};

describe('fallbackBuyerSegments', () => {
  it('returns three distinct segments by default', () => {
    const segments = fallbackBuyerSegments(sampleBrief, 3);
    expect(segments).toHaveLength(3);
    expect(new Set(segments.map((s) => s.segment)).size).toBe(3);
    expect(segments.every((s) => s.description.includes('Produktionsleiter') || s.personaDescription.includes('Acme'))).toBe(
      true
    );
  });

  it('respects requested count', () => {
    expect(fallbackBuyerSegments(sampleBrief, 1)).toHaveLength(1);
    expect(fallbackBuyerSegments(sampleBrief, 2)).toHaveLength(2);
  });
});
