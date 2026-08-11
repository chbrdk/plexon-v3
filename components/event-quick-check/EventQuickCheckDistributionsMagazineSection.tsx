'use client'

import { Hint, Text } from '@msqdx/ui'
import { EqcDistributionDonut } from '@/components/event-quick-check/EqcDistributionDonut'
import type { EventQuickCheckReportDistributionsSection } from '@/lib/assistant/reports/event-quick-check-report-types'
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy'

type Props = {
  distributions: EventQuickCheckReportDistributionsSection
}

/**
 * Checkion-parity corpus donuts — Readability / Eco grades / Link mix.
 */
export function EventQuickCheckDistributionsMagazineSection({ distributions }: Props) {
  const { readability, eco, links } = distributions
  const cardCount =
    (readability?.bands.length ? 1 : 0) + (eco?.grades.length ? 1 : 0) + (links?.slices.length ? 1 : 0)

  return (
    <section
      className="plexon-eqc-dist"
      data-section="eqc-distributions"
      data-testid="eqc-distributions"
      aria-labelledby="eqc-dist-heading"
    >
      <header className="plexon-eqc-dist__head">
        <p className="plexon-eqc-dist__eyebrow">{EQC_REPORT_COPY.sectionDistributions}</p>
        <h3 id="eqc-dist-heading" className="plexon-eqc-dist__headline">
          {EQC_REPORT_COPY.sectionDistributionsHeadline}
        </h3>
        <Hint>{EQC_REPORT_COPY.sectionDistributionsHint}</Hint>
      </header>

      <div
        className="plexon-eqc-dist__grid"
        style={{ ['--eqc-dist-cols' as string]: String(Math.max(cardCount, 1)) }}
      >
        {readability?.bands.length ? (
          <div className="plexon-eqc-dist__card">
            <h4>{EQC_REPORT_COPY.distReadability}</h4>
            {readability.grade || readability.dwellSecondsMedian != null ? (
              <Text role="meta">
                {readability.grade ? `Corpus grade ${readability.grade}` : ''}
                {readability.dwellSecondsMedian != null
                  ? `${readability.grade ? ' · ' : ''}median dwell ${readability.dwellSecondsMedian}s`
                  : ''}
              </Text>
            ) : null}
            <EqcDistributionDonut
              aria-label="Readability band share"
              slices={readability.bands}
              centerValue={readability.score}
              centerLabel={EQC_REPORT_COPY.distScoreLabel}
            />
          </div>
        ) : null}

        {eco?.grades.length ? (
          <div className="plexon-eqc-dist__card">
            <h4>{EQC_REPORT_COPY.distEcoGrades}</h4>
            {eco.grade || eco.avgCo2 != null ? (
              <Text role="meta">
                {eco.grade ? `Dominant ${eco.grade}` : ''}
                {eco.avgCo2 != null
                  ? `${eco.grade ? ' · ' : ''}avg ${eco.avgCo2} g CO₂`
                  : ''}
              </Text>
            ) : null}
            <EqcDistributionDonut
              aria-label="Eco grade share"
              slices={eco.grades}
              centerValue={eco.grade}
              centerLabel={EQC_REPORT_COPY.distModeLabel}
            />
          </div>
        ) : null}

        {links?.slices.length ? (
          <div className="plexon-eqc-dist__card">
            <h4>{EQC_REPORT_COPY.distLinkMix}</h4>
            <Text role="meta">{links.total.toLocaleString()} total</Text>
            <EqcDistributionDonut
              aria-label="Internal, external and broken links"
              slices={links.slices}
              centerValue={links.broken.toLocaleString()}
              centerLabel={EQC_REPORT_COPY.distBrokenLabel}
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}
