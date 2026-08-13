export const EQC_GEO_CLAUDE_MODELS = [
  'claude-fable-5',
  'claude-opus-5',
  'claude-sonnet-5',
  'claude-opus-4-8',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
] as const

/**
 * Default LLMs for Event Quick Check GEO jobs (CHECKION multi-provider live set).
 * Without an explicit `models` array Checkion falls back to a single OPENAI_MODEL —
 * then the results magazine has nothing to switch.
 */
export const EQC_GEO_DEFAULT_MODELS = [
  'gpt-5.6-luna',
  'gpt-5.6-terra',
  'gpt-5.6-sol',
  ...EQC_GEO_CLAUDE_MODELS,
  'gemini-3.6-flash',
] as const

export function eqcGeoDefaultModels(): string[] {
  return [...EQC_GEO_DEFAULT_MODELS]
}
