import { describe, expect, it } from 'vitest';
import {
  buildAudionPersonaGenerateRequestBody,
  normalizeAudionPersonaOutputLocale,
  PLEXON_DEFAULT_AUDION_PERSONA_OUTPUT_LOCALE,
} from '@/lib/integrations/audion-persona-locale';

describe('audion-persona-locale', () => {
  it('defaults to German for PLEXON persona display parsing', () => {
    expect(PLEXON_DEFAULT_AUDION_PERSONA_OUTPUT_LOCALE).toBe('de');
    expect(normalizeAudionPersonaOutputLocale(undefined)).toBe('de');
    expect(normalizeAudionPersonaOutputLocale('en')).toBe('en');
  });

  it('sends output_locale for native audion-v3 generate language', () => {
    const body = buildAudionPersonaGenerateRequestBody({
      segment: 'Handwerk',
      description: 'Zielgruppe für Messe',
    });
    expect(body).toEqual({
      segment: 'Handwerk',
      description: 'Zielgruppe für Messe',
      filter_mode: 'auto',
      output_locale: 'de',
    });

    const en = buildAudionPersonaGenerateRequestBody({
      segment: 'Trade',
      description: 'Trade buyers',
      outputLocale: 'en',
    });
    expect(en.output_locale).toBe('en');
  });
});
