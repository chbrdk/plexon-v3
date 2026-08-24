import type { EventQuickCheckReportGeoSection } from '@/lib/assistant/reports/event-quick-check-report-types'

export type EqcGeoSnapshot = {
  /** Mean citedShare across layers that have a score (0–100). */
  citedShare: number | null
  /** On-page GEO fitness — usually from the primary layer page scan. */
  geoFitnessScore: number | null
  promptCount: number
}

function scoreOrNull(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return value <= 1 ? Math.round(value * 100) : Math.round(value)
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round(values.reduce((sum, n) => sum + n, 0) / values.length)
}

/**
 * Fixed magazine snapshot dials across all GEO layers.
 * Spec: specs/domain/eqc-as-collection-flow.md — dials must not follow the layer switch.
 */
export function buildEqcGeoSnapshot(
  layers: readonly EventQuickCheckReportGeoSection[] | undefined,
  fallback?: EventQuickCheckReportGeoSection
): EqcGeoSnapshot {
  const list = layers?.length ? [...layers] : fallback ? [fallback] : []
  const citedShares = list
    .map((layer) => scoreOrNull(layer.citedShare))
    .filter((n): n is number => n != null)
  const fitnessScores = list
    .map((layer) => scoreOrNull(layer.geoFitnessScore))
    .filter((n): n is number => n != null)
  const promptCount = Math.max(
    0,
    ...list.map((layer) => layer.questions.length || layer.citationHighlights.length || 0)
  )

  return {
    citedShare: mean(citedShares),
    // Page scan runs once on the primary layer — prefer first available fitness.
    geoFitnessScore: fitnessScores[0] ?? null,
    promptCount,
  }
}
