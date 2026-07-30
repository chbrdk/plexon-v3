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

  it('omits output_locale on AUDION generate so profile_de mirror is populated', () => {
    const body = buildAudionPersonaGenerateRequestBody({
      segment: 'Handwerk',
      description: 'Zielgruppe für Messe',
    });
    expect(body).toEqual({
      segment: 'Handwerk',
      description: 'Zielgruppe für Messe',
      filter_mode: 'auto',
    });
    expect(body).not.toHaveProperty('output_locale');
  });
});
