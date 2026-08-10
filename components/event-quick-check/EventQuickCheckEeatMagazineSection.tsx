'use client'

import { Text } from '@msqdx/ui'
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types'
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy'
import { buildEqcEeatReadingFallback } from '@/lib/assistant/reports/event-quick-check/build-eqc-eeat-reading'

type Props = {
  report: EventQuickCheckReportModel
}

/**
 * Dedicated E-E-A-T magazine chapter (ledger + reading + gaps).
 */
export function EventQuickCheckEeatMagazineSection({ report }: Props) {
  const geo = report.geo
  const eeatSorted = [...geo.eeatDimensions].sort((a, b) => a.score - b.score)
  if (!eeatSorted.length) return null

  const weakest = eeatSorted[0]
  const strongest = eeatSorted[eeatSorted.length - 1]
  const eeatSpan =
    weakest && strongest ? Math.max(0, strongest.score - weakest.score) : null

  return (
    <div className="plexon-eqc-geo-spread" data-section="eqc-eeat-spread">
      <section className="plexon-eqc-geo-eeat" aria-labelledby="eqc-geo-eeat-heading">
        <header className="plexon-eqc-geo-voice__head">
          <Text role="meta" as="p" className="plexon-eqc-geo-eyebrow">
            On-page
          </Text>
          <Text role="display" as="h3" id="eqc-geo-eeat-heading">
            {EQC_REPORT_COPY.sectionGeoEeat}
          </Text>
          <div className="plexon-eqc-geo-eeat__reading">
            <Text role="meta" as="p" className="plexon-eqc-geo-eyebrow">
              {EQC_REPORT_COPY.geoEeatReadingLabel}
            </Text>
            <p className="plexon-eqc-geo-eeat__reading-body">
              {buildEqcEeatReadingFallback({
                dimensions: eeatSorted,
                missingElements: geo.eeatMissingElements,
                geoFitnessReasoning: geo.geoFitnessReasoning,
                weakest,
                strongest,
              }) || EQC_REPORT_COPY.geoEeatWhyFallback}
            </p>
          </div>
        </header>
        <div className="plexon-eqc-geo-eeat__layout">
          <div className="plexon-eqc-geo-score-ledger" aria-label={EQC_REPORT_COPY.sectionGeoEeat}>
            {eeatSorted.map((d, index) => (
              <div
                key={d.key}
                className="plexon-eqc-geo-score-ledger__cell"
                style={{ ['--bar' as string]: `${Math.max(0, Math.min(100, d.score))}%` }}
              >
                <span className="plexon-eqc-geo-score-ledger__idx">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="plexon-eqc-geo-score-ledger__label">{d.label}</span>
                <span className="plexon-eqc-geo-score-ledger__value">{d.score}</span>
                <span className="plexon-eqc-geo-score-ledger__bar" aria-hidden />
                {d.reasoning ? (
                  <p className="plexon-eqc-geo-score-ledger__why">{d.reasoning}</p>
                ) : null}
              </div>
            ))}
          </div>
          <div className="plexon-eqc-geo-eeat__side">
            {eeatSpan != null && weakest && strongest ? (
              <aside className="plexon-eqc-geo-callout">
                <Text role="meta" as="p" className="plexon-eqc-geo-eyebrow">
                  Spanne
                </Text>
                <p className="plexon-eqc-geo-callout__num">{eeatSpan}</p>
                <Text role="hint" as="p">
                  Punkte zwischen {weakest.label} ({weakest.score}) und {strongest.label} (
                  {strongest.score}).
                </Text>
              </aside>
            ) : null}
            {(geo.eeatMissingElements?.length ?? 0) > 0 ? (
              <div
                className="plexon-eqc-geo-eeat-gaps"
                aria-label={EQC_REPORT_COPY.geoEeatGapsLabel}
              >
                <Text role="meta" as="p" className="plexon-eqc-geo-eyebrow">
                  {EQC_REPORT_COPY.geoEeatGapsLabel}
                </Text>
                <ul className="plexon-eqc-geo-eeat-gaps__list">
                  {geo.eeatMissingElements!.map((el) => (
                    <li key={el}>{el}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}
