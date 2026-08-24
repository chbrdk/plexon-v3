import type { EventQuickCheckReportGeoSection } from '@/lib/assistant/reports/event-quick-check-report-types'
import { normalizeGeoDomain } from '@/lib/integrations/normalize-geo-domain'

export type EqcGeoSnapshot = {
  /**
   * Headline GEO Score: mean of cross-layer citation strength + on-page fitness
   * when both exist; otherwise whichever signal is available.
   */
  geoScore: number | null
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

/** Own-domain SoV / score as citation fallback when citedShare was not persisted. */
function citationFallbackFromCompetitors(
  layer: EventQuickCheckReportGeoSection
): number | null {
  const ownHost = normalizeGeoDomain(layer.url ?? '')
  if (!ownHost) return null
  for (const row of layer.competitors) {
    if (normalizeGeoDomain(row.name) !== ownHost) continue
    return scoreOrNull(row.shareOfVoice ?? row.score ?? null)
  }
  return null
}

function citationForLayer(layer: EventQuickCheckReportGeoSection): number | null {
  return scoreOrNull(layer.citedShare) ?? citationFallbackFromCompetitors(layer)
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
    .map((layer) => citationForLayer(layer))
    .filter((n): n is number => n != null)
  const fitnessScores = list
    .map((layer) => scoreOrNull(layer.geoFitnessScore))
    .filter((n): n is number => n != null)
  const promptCount = Math.max(
    0,
    ...list.map((layer) => layer.questions.length || layer.citationHighlights.length || 0)
  )

  const citedShare = mean(citedShares)
  // Page scan runs once on the primary layer — prefer first available fitness.
  const geoFitnessScore = fitnessScores[0] ?? null
  const geoScoreParts = [citedShare, geoFitnessScore].filter((n): n is number => n != null)

  return {
    geoScore: mean(geoScoreParts),
    citedShare,
    geoFitnessScore,
    promptCount,
  }
}
