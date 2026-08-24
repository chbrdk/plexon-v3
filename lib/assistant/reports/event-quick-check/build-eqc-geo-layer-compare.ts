import type { EventQuickCheckReportGeoSection } from '@/lib/assistant/reports/event-quick-check-report-types'
import type { GeoMeasurement } from '@/lib/geo/measurement'
import { GEO_MEASUREMENT_ORDER } from '@/lib/geo/measurement'

export type EqcGeoLayerCompareRow = {
  measurement: GeoMeasurement
  citedShare: number | null
  geoFitnessScore: number | null
}

export type EqcGeoLayerCompare = {
  layers: EqcGeoLayerCompareRow[]
  /** Higher citedShare wins; null when fewer than two scored layers. */
  winner: GeoMeasurement | 'tie' | null
}

function scoreOrNull(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return value <= 1 ? Math.round(value * 100) : Math.round(value)
}

/**
 * Compact dual-layer compare for the EQC magazine GEO band.
 * Spec: specs/domain/eqc-as-collection-flow.md (Magazine dual layers).
 */
export function buildEqcGeoLayerCompare(
  layers: readonly EventQuickCheckReportGeoSection[] | undefined
): EqcGeoLayerCompare | null {
  if (!layers || layers.length < 2) return null

  const byMeasurement = new Map<GeoMeasurement, EqcGeoLayerCompareRow>()
  for (const layer of layers) {
    const measurement = layer.measurement
    if (measurement !== 'recall' && measurement !== 'live') continue
    if (byMeasurement.has(measurement)) continue
    byMeasurement.set(measurement, {
      measurement,
      citedShare: scoreOrNull(layer.citedShare),
      geoFitnessScore: scoreOrNull(layer.geoFitnessScore),
    })
  }

  const rows = GEO_MEASUREMENT_ORDER.map((m) => byMeasurement.get(m)).filter(
    (row): row is EqcGeoLayerCompareRow => row != null
  )
  if (rows.length < 2) return null

  const scored = rows.filter((row) => row.citedShare != null)
  let winner: EqcGeoLayerCompare['winner'] = null
  if (scored.length >= 2) {
    const a = scored[0]!
    const b = scored[1]!
    if (a.citedShare === b.citedShare) winner = 'tie'
    else winner = (a.citedShare! > b.citedShare! ? a.measurement : b.measurement) as GeoMeasurement
  }

  return { layers: rows, winner }
}
