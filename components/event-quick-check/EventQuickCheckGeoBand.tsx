'use client'

import { useMemo, useState } from 'react'
import { Text, ToggleGroup } from '@msqdx/ui'
import { EventQuickCheckGeoMagazineSection } from '@/components/event-quick-check/EventQuickCheckGeoMagazineSection'
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types'
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy'
import { buildEqcGeoLayerCompare } from '@/lib/assistant/reports/event-quick-check/build-eqc-geo-layer-compare'
import {
  geoMeasurementMagazineLabel,
  type GeoMeasurement,
} from '@/lib/geo/measurement'

type Props = {
  report: EventQuickCheckReportModel
}

function formatScore(value: number | null): string {
  return value == null ? '—' : String(Math.round(value))
}

/**
 * Dual-layer GEO band: compare strip + exclusive layer switch + one magazine chapter.
 * Spec: specs/domain/eqc-as-collection-flow.md
 */
export function EventQuickCheckGeoBand({ report }: Props) {
  const layers = report.geoLayers?.length ? report.geoLayers : [report.geo]
  const dual = layers.length > 1
  const compare = useMemo(() => buildEqcGeoLayerCompare(report.geoLayers), [report.geoLayers])

  const initialMeasurement: GeoMeasurement =
    layers[0]?.measurement === 'live' || layers[0]?.measurement === 'recall'
      ? layers[0].measurement
      : report.geo.measurement === 'live'
        ? 'live'
        : 'recall'

  const [activeMeasurement, setActiveMeasurement] = useState<GeoMeasurement>(initialMeasurement)

  const activeGeo =
    layers.find((layer) => layer.measurement === activeMeasurement) ?? layers[0] ?? report.geo

  const switchOptions = layers
    .map((layer) => layer.measurement)
    .filter((m): m is GeoMeasurement => m === 'recall' || m === 'live')
    .filter((m, index, all) => all.indexOf(m) === index)
    .map((measurement) => ({
      value: measurement,
      label: geoMeasurementMagazineLabel(measurement),
    }))

  const verdict =
    compare?.winner === 'tie'
      ? EQC_REPORT_COPY.geoLayerCompareTie
      : compare?.winner === 'recall' || compare?.winner === 'live'
        ? EQC_REPORT_COPY.geoLayerCompareWinner(geoMeasurementMagazineLabel(compare.winner))
        : EQC_REPORT_COPY.geoLayerCompareUnavailable

  return (
    <div className="plexon-eqc-geo-band" data-section="eqc-geo-band">
      {dual && compare ? (
        <div className="plexon-eqc-geo-layer-compare" aria-label={EQC_REPORT_COPY.geoLayerCompareTitle}>
          <div className="plexon-eqc-geo-layer-compare__head">
            <Text role="label" as="h3">
              {EQC_REPORT_COPY.geoLayerCompareTitle}
            </Text>
            <Text role="hint" as="p" className="plexon-eqc-geo-layer-compare__verdict">
              {verdict}
            </Text>
          </div>
          <div className="plexon-eqc-geo-layer-compare__grid">
            {compare.layers.map((row) => {
              const isWinner = compare.winner === row.measurement
              return (
                <div
                  key={row.measurement}
                  className={
                    isWinner
                      ? 'plexon-eqc-geo-layer-compare__card plexon-eqc-geo-layer-compare__card--winner'
                      : 'plexon-eqc-geo-layer-compare__card'
                  }
                  data-measurement={row.measurement}
                  data-winner={isWinner ? 'true' : undefined}
                >
                  <Text role="meta" as="p" className="plexon-eqc-geo-layer-compare__label">
                    {geoMeasurementMagazineLabel(row.measurement)}
                  </Text>
                  <dl className="plexon-eqc-geo-layer-compare__metrics">
                    <div>
                      <dt>{EQC_REPORT_COPY.geoLayerCompareScore}</dt>
                      <dd>{formatScore(row.overallScore)}</dd>
                    </div>
                    <div>
                      <dt>{EQC_REPORT_COPY.geoLayerCompareFitness}</dt>
                      <dd>{formatScore(row.geoFitnessScore)}</dd>
                    </div>
                  </dl>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {dual && switchOptions.length > 1 ? (
        <div className="plexon-eqc-geo-band__switch">
          <Text role="hint" as="p">
            {EQC_REPORT_COPY.geoLayerSwitcherLabel}
          </Text>
          <ToggleGroup
            value={activeMeasurement}
            onChange={(value) => setActiveMeasurement(value as GeoMeasurement)}
            aria-label={EQC_REPORT_COPY.geoLayerSwitcherLabel}
            options={switchOptions}
          />
        </div>
      ) : null}

      <EventQuickCheckGeoMagazineSection
        report={report}
        geo={activeGeo}
        showQuestions
      />
    </div>
  )
}
