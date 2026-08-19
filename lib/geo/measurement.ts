/**
 * GEO measurement layers — CHECKION jobs stay one layer each.
 * @see checkion-v3/specs/domain/geo-measurement-layers.md
 * @see specs/domain/eqc-as-collection-flow.md
 */

export type GeoMeasurement = 'recall' | 'live'

export const GEO_MEASUREMENT_DEFAULT: GeoMeasurement = 'recall'

export const GEO_MEASUREMENT_ORDER: readonly GeoMeasurement[] = ['recall', 'live']

export function parseGeoMeasurement(value: unknown): GeoMeasurement {
  return value === 'live' ? 'live' : GEO_MEASUREMENT_DEFAULT
}

/** UI / resume list. Empty or unknown → `[]`. `'both'` selects both layers. */
export function parseGeoMeasurements(value: unknown): GeoMeasurement[] {
  const collected = new Set<GeoMeasurement>()
  const push = (raw: unknown) => {
    if (raw === 'live') collected.add('live')
    else if (raw === 'recall') collected.add('recall')
    else if (raw === 'both') {
      collected.add('recall')
      collected.add('live')
    } else if (typeof raw === 'string' && /[,\s]/.test(raw)) {
      for (const part of raw.split(/[,\s]+/)) {
        if (part) push(part.trim())
      }
    }
  }
  if (Array.isArray(value)) {
    for (const item of value) push(item)
  } else if (value != null && value !== '') {
    push(value)
  }
  return GEO_MEASUREMENT_ORDER.filter((m) => collected.has(m))
}

export function parseGeoMeasurementsOrDefault(value: unknown): GeoMeasurement[] {
  const parsed = parseGeoMeasurements(value)
  return parsed.length ? parsed : [GEO_MEASUREMENT_DEFAULT]
}

export function toggleGeoMeasurement(
  current: readonly GeoMeasurement[],
  id: GeoMeasurement
): GeoMeasurement[] {
  const set = new Set(parseGeoMeasurements([...current]))
  if (set.has(id)) set.delete(id)
  else set.add(id)
  return GEO_MEASUREMENT_ORDER.filter((m) => set.has(m))
}

export function geoMeasurementLabel(measurement: GeoMeasurement): string {
  return measurement === 'live' ? 'Live-Suche' : 'Modellgedächtnis'
}

export function geoMeasurementLayerKicker(measurement: GeoMeasurement): string {
  return measurement === 'live' ? 'Layer 2' : 'Layer 1'
}

export function geoMeasurementMagazineLabel(measurement: GeoMeasurement): string {
  return `${geoMeasurementLayerKicker(measurement)} · ${geoMeasurementLabel(measurement)}`
}
