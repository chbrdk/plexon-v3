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
 * audion-v3 native generate uses `output_locale` for LLM language (no `profile_de` mirror).
 * Pass the UI locale so magazine personas match EQC copy language.
 */
export function buildAudionPersonaGenerateRequestBody(input: {
  segment: string;
  description: string;
  filterMode?: string;
  outputLocale?: AudionPersonaOutputLocale;
}): Record<string, string> {
  return {
    segment: input.segment,
    description: input.description,
    filter_mode: input.filterMode ?? 'auto',
    output_locale: input.outputLocale ?? PLEXON_DEFAULT_AUDION_PERSONA_OUTPUT_LOCALE,
  };
}
