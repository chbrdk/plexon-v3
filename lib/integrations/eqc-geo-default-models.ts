/**
 * Default LLMs for Event Quick Check GEO jobs (CHECKION multi-provider live set).
 * Without an explicit `models` array Checkion falls back to a single OPENAI_MODEL —
 * then the results magazine has nothing to switch.
 */
export const EQC_GEO_DEFAULT_MODELS = [
  'gpt-5.6-luna',
  'gpt-5.6-terra',
  'gpt-5.6-sol',
  'claude-sonnet-5',
  'gemini-3.6-flash',
] as const

export function eqcGeoDefaultModels(): string[] {
  return [...EQC_GEO_DEFAULT_MODELS]
}
