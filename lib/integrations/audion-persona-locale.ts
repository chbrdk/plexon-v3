/** Default display locale when parsing AUDION PersonaResponse for PLEXON UI. */
export const PLEXON_DEFAULT_AUDION_PERSONA_OUTPUT_LOCALE = 'de' as const;

export type AudionPersonaOutputLocale = typeof PLEXON_DEFAULT_AUDION_PERSONA_OUTPUT_LOCALE | 'en';

export function normalizeAudionPersonaOutputLocale(
  value: string | undefined | null
): AudionPersonaOutputLocale {
  const trimmed = value?.trim().toLowerCase();
  return trimmed === 'en' ? 'en' : PLEXON_DEFAULT_AUDION_PERSONA_OUTPUT_LOCALE;
}

/**
 * AUDION `POST …/personas/generate` stores English strings in `profile` and mirrors German in
 * `profile_de` when `output_locale` is omitted. Sending `output_locale: "de"` breaks that mirror.
 */
export function buildAudionPersonaGenerateRequestBody(input: {
  segment: string;
  description: string;
  filterMode?: string;
}): Record<string, string> {
  return {
    segment: input.segment,
    description: input.description,
    filter_mode: input.filterMode ?? 'auto',
  };
}
