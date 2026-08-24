export const EQC_GEO_ALLOWED_MODELS = [
  'gpt-5.6-terra',
  'claude-sonnet-5',
  'gemini-3.6-flash',
] as const

/**
 * Default LLMs for Event Quick Check GEO jobs (CHECKION multi-provider live set).
 * Without an explicit `models` array Checkion falls back to a single OPENAI_MODEL —
 * then the results magazine has nothing to switch.
 */
export const EQC_GEO_DEFAULT_MODELS = [
  'gpt-5.6-terra',
  'claude-sonnet-5',
  'gemini-3.6-flash',
] as const

export function eqcGeoDefaultModels(): string[] {
  return [...EQC_GEO_DEFAULT_MODELS]
}

export function sanitizeEqcGeoModels(models?: string[]): string[] {
  const requested = Array.isArray(models) ? models : []
  const allowed = new Set<string>(EQC_GEO_ALLOWED_MODELS)
  const filtered = requested.filter((modelId, index) => {
    if (typeof modelId !== 'string') return false
    if (!allowed.has(modelId)) return false
    return requested.indexOf(modelId) === index
  })
  return filtered.length > 0 ? filtered : eqcGeoDefaultModels()
}
