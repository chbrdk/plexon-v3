/**
 * Default LLMs for Event Quick Check GEO jobs (CHECKION v3 live OpenAI set).
 * Without an explicit `models` array Checkion falls back to a single OPENAI_MODEL —
 * then the results magazine has nothing to switch.
 */
export const EQC_GEO_DEFAULT_MODELS = [
  'gpt-5.4-nano',
  'gpt-5.4-mini',
  'gpt-5.5',
] as const

export function eqcGeoDefaultModels(): string[] {
  return [...EQC_GEO_DEFAULT_MODELS]
}
