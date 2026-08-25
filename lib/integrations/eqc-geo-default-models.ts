import type { GeoMeasurement } from '@/lib/geo/measurement'

/** Layer 2 (live) — curated cost/latency trio. */
export const EQC_GEO_LIVE_MODELS = [
  'gpt-5.6-terra',
  'claude-sonnet-5',
  'gemini-3.6-flash',
] as const

/**
 * Layer 1 (recall / model memory) — broader multi-provider set:
 * GPT-5.6 luna/terra/sol + Claude Opus/Sonnet/Haiku + Gemini Flash.
 */
export const EQC_GEO_RECALL_MODELS = [
  'gpt-5.6-luna',
  'gpt-5.6-terra',
  'gpt-5.6-sol',
  'claude-opus-5',
  'claude-sonnet-5',
  'claude-haiku-4-5',
  'gemini-3.6-flash',
] as const

/** Union of models allowed on any EQC GEO job. */
export const EQC_GEO_ALLOWED_MODELS = [
  ...new Set<string>([...EQC_GEO_RECALL_MODELS, ...EQC_GEO_LIVE_MODELS]),
] as const

/** @deprecated Prefer eqcGeoDefaultModelsForMeasurement — kept as live trio alias. */
export const EQC_GEO_DEFAULT_MODELS = EQC_GEO_LIVE_MODELS

export function eqcGeoDefaultModels(): string[] {
  return [...EQC_GEO_LIVE_MODELS]
}

export function eqcGeoDefaultModelsForMeasurement(
  measurement?: GeoMeasurement | string | null
): string[] {
  return measurement === 'live' ? [...EQC_GEO_LIVE_MODELS] : [...EQC_GEO_RECALL_MODELS]
}

/**
 * Sanitize requested models for an EQC GEO job.
 * WHEN measurement is `live`, only the curated trio is allowed.
 * WHEN measurement is `recall` (or omitted), the broader Layer-1 set is allowed.
 */
export function sanitizeEqcGeoModels(
  models?: string[],
  measurement?: GeoMeasurement | string | null
): string[] {
  const defaults = eqcGeoDefaultModelsForMeasurement(measurement)
  const allowed =
    measurement === 'live'
      ? new Set<string>(EQC_GEO_LIVE_MODELS)
      : new Set<string>(EQC_GEO_ALLOWED_MODELS)
  const requested = Array.isArray(models) ? models : []
  const filtered = requested.filter((modelId, index) => {
    if (typeof modelId !== 'string') return false
    if (!allowed.has(modelId)) return false
    return requested.indexOf(modelId) === index
  })
  return filtered.length > 0 ? filtered : defaults
}
