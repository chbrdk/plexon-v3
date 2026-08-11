'use client'

import { Hint, Text } from '@msqdx/ui'
import { EqcDistributionDonut } from '@/components/event-quick-check/EqcDistributionDonut'
import type { EventQuickCheckReportDistributionsSection } from '@/lib/assistant/reports/event-quick-check-report-types'
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy'
import {
  localizeDistSliceLabel,
  localizeReadabilityGrade,
} from '@/lib/integrations/map-domain-scan-distributions'

type Props = {
  distributions: EventQuickCheckReportDistributionsSection
}

/**
 * Checkion-parity corpus donuts — Lesbarkeit / Eco-Noten / Link-Mix.
 */
export function EventQuickCheckDistributionsMagazineSection({ distributions }: Props) {
  const { readability, eco, links } = distributions
  const cardCount =
    (readability?.bands.length ? 1 : 0) + (eco?.grades.length ? 1 : 0) + (links?.slices.length ? 1 : 0)

  const readabilitySlices = readability?.bands.map((s) => ({
    ...s,
    label: localizeDistSliceLabel(s.id, s.label),
  }))
  const linkSlices = links?.slices.map((s) => ({
    ...s,
    label: localizeDistSliceLabel(s.id, s.label),
  }))
  const gradeLabel = readability?.grade
    ? localizeReadabilityGrade(readability.grade)
    : null

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
        {readabilitySlices?.length ? (
          <div className="plexon-eqc-dist__card">
            <h4>{EQC_REPORT_COPY.distReadability}</h4>
            {gradeLabel || readability?.dwellSecondsMedian != null ? (
              <Text role="meta">
                {gradeLabel ? EQC_REPORT_COPY.distCorpusGrade(gradeLabel) : ''}
                {readability?.dwellSecondsMedian != null
                  ? `${gradeLabel ? ' · ' : ''}${EQC_REPORT_COPY.distMedianDwell(readability.dwellSecondsMedian)}`
                  : ''}
              </Text>
            ) : null}
            <EqcDistributionDonut
              aria-label={EQC_REPORT_COPY.distReadabilityAria}
              slices={readabilitySlices}
              centerValue={readability?.score}
              centerLabel={EQC_REPORT_COPY.distScoreLabel}
            />
          </div>
        ) : null}

        {eco?.grades.length ? (
          <div className="plexon-eqc-dist__card">
            <h4>{EQC_REPORT_COPY.distEcoGrades}</h4>
            {eco.grade || eco.avgCo2 != null ? (
              <Text role="meta">
                {eco.grade ? EQC_REPORT_COPY.distDominantGrade(eco.grade) : ''}
                {eco.avgCo2 != null
                  ? `${eco.grade ? ' · ' : ''}${EQC_REPORT_COPY.distAvgCo2(eco.avgCo2)}`
                  : ''}
              </Text>
            ) : null}
            <EqcDistributionDonut
              aria-label={EQC_REPORT_COPY.distEcoAria}
              slices={eco.grades}
              centerValue={eco.grade}
              centerLabel={EQC_REPORT_COPY.distModeLabel}
            />
          </div>
        ) : null}

        {linkSlices?.length ? (
          <div className="plexon-eqc-dist__card">
            <h4>{EQC_REPORT_COPY.distLinkMix}</h4>
            <Text role="meta">
              {EQC_REPORT_COPY.distLinksTotal(links!.total.toLocaleString('de-DE'))}
            </Text>
            <EqcDistributionDonut
              aria-label={EQC_REPORT_COPY.distLinksAria}
              slices={linkSlices}
              centerValue={links!.broken.toLocaleString('de-DE')}
              centerLabel={EQC_REPORT_COPY.distBrokenLabel}
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}
