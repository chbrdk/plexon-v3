import type { EventQuickCheckReportGeoSection } from '@/lib/assistant/reports/event-quick-check-report-types'
import { normalizeGeoDomain } from '@/lib/integrations/normalize-geo-domain'

function scoreOrNull(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return value <= 1 ? Math.round(value * 100) : Math.round(value)
}

function hostsMatch(a: string, b: string): boolean {
  const left = normalizeGeoDomain(a)
  const right = normalizeGeoDomain(b)
  return Boolean(left && right && left === right)
}

/** Own-domain SoV / score when citedShare was not persisted on the job. */
function citationFallbackFromCompetitors(
  layer: EventQuickCheckReportGeoSection
): number | null {
  const ownHost = normalizeGeoDomain(layer.url ?? '')
  if (!ownHost) return null
  for (const row of layer.competitors) {
    if (!hostsMatch(row.name, ownHost)) continue
    return scoreOrNull(row.shareOfVoice ?? row.score ?? null)
  }
  return null
}

/**
 * Reconstruct citedShare from per-model query runs when CHECKION left the
 * scalar null/0 but still returned citation placements (common on thin catalog).
 */
function citationFromHighlights(layer: EventQuickCheckReportGeoSection): number | null {
  const ownHost = normalizeGeoDomain(layer.url ?? '')
  if (!ownHost) return null

  const byModel = layer.citationHighlightsByModel
  if (byModel?.length) {
    let cells = 0
    let hits = 0
    for (const slice of byModel) {
      const runs = slice.runs ?? []
      if (runs.length === 0) continue
      for (const run of runs) {
        cells += 1
        if ((run.citations ?? []).some((c) => hostsMatch(c.domain, ownHost))) hits += 1
      }
    }
    if (cells > 0) return Math.round((100 * hits) / cells)
  }

  const flat = [
    ...(layer.citationHighlights ?? []),
    ...(byModel ?? []).flatMap((slice) => slice.citations ?? []),
  ]
  if (flat.length === 0) return null

  const hitQueries = new Set(
    flat.filter((c) => hostsMatch(c.domain, ownHost)).map((c) => c.query)
  )
  if (hitQueries.size === 0) return null
  const denom = Math.max(layer.questions.length, hitQueries.size)
  return Math.round((100 * hitQueries.size) / denom)
}

/**
 * Citation strength 0–100 for a GEO layer.
 * Prefer persisted citedShare; otherwise recover from own SoV or citation dossier.
 * Never fall back to on-page geoFitness.
 */
export function resolveEqcCitedShare(
  layer: EventQuickCheckReportGeoSection
): number | null {
  const direct = scoreOrNull(layer.citedShare)
  if (direct != null && direct > 0) return direct

  const recovered =
    citationFallbackFromCompetitors(layer) ?? citationFromHighlights(layer)
  if (recovered != null && recovered > 0) return recovered

  // Genuine zero (no citations) vs missing — keep 0 only when explicitly stored.
  if (direct === 0) return 0
  return null
}

export function scoreOrNullEqc(value: number | null | undefined): number | null {
  return scoreOrNull(value)
}
