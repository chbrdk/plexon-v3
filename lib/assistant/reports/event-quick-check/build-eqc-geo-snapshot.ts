import type { EventQuickCheckReportGeoSection } from '@/lib/assistant/reports/event-quick-check-report-types'
import { normalizeGeoDomain } from '@/lib/integrations/normalize-geo-domain'

export type EqcGeoSnapshot = {
  /**
   * Headline GEO Score = cross-layer citation strength (citedShare / own SoV).
   * Never equals on-page fitness — that stays in geoFitnessScore.
   */
  geoScore: number | null
  /** Mean citedShare across layers (0–100); same signal as geoScore when available. */
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
 * GEO Score = citation; GEO Fitness = on-page — never collapse Score onto Fitness.
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

  return {
    geoScore: citedShare,
    citedShare,
    // Page scan runs once on the primary layer — prefer first available fitness.
    geoFitnessScore: fitnessScores[0] ?? null,
    promptCount,
  }
}
