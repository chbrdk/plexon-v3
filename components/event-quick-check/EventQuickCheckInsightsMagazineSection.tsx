'use client'

import { Text } from '@msqdx/ui'
import type {
  EventQuickCheckReportInsightFinding,
  EventQuickCheckReportInsightsSection,
} from '@/lib/assistant/reports/event-quick-check-report-types'
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy'
import { filterEqcMetaFindings } from '@/lib/assistant/insights/eqc-insight-quality'
import { formatInsightProse } from '@/lib/assistant/insights/format-insight-prose'
import type { UiTone } from '@/lib/assistant/ui-blocks/types'

type Props = {
  insights: EventQuickCheckReportInsightsSection
  domainLabel?: string
}

type MagTone = 'pos' | 'low' | 'neg'

function toneFromUi(tone?: UiTone): MagTone {
  if (tone === 'success') return 'pos'
  if (tone === 'warning' || tone === 'info' || tone === 'neutral') return 'low'
  if (tone === 'error') return 'neg'
  return 'low'
}

function severityLabel(tone?: UiTone): string {
  if (tone === 'error') return 'kritisch'
  if (tone === 'success') return 'positiv'
  if (tone === 'warning') return 'mittel'
  return 'hinweis'
}

function FindingOps({ findings }: { findings: EventQuickCheckReportInsightFinding[] }) {
  const visible = filterEqcMetaFindings(findings)
  if (!visible.length) return null
  return (
    <ol className="plexon-eqc-insights__ops" aria-label={EQC_REPORT_COPY.sectionFindings}>
      {visible.map((f, i) => {
        const tone = toneFromUi(f.severity)
        return (
          <li key={`${f.title}-${i}`}>
            <div className="plexon-eqc-insights__op" data-tone={tone}>
              <span className="plexon-eqc-insights__op-contrast" aria-hidden>
                <span className="plexon-eqc-insights__op-idx">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="plexon-eqc-insights__op-sev">{severityLabel(f.severity)}</span>
              </span>
              <span className="plexon-eqc-insights__op-q">{f.title}</span>
              {f.description ? (
                <span className="plexon-eqc-insights__op-meta">{f.description}</span>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Einschätzung & Empfehlungen — Checkion GEO magazine stack:
 * Verdict open + reading → findings as opportunities → moves carousel.
 */
export function EventQuickCheckInsightsMagazineSection({ insights, domainLabel }: Props) {
  const verdict = insights.fazit?.trim() || insights.assessment?.trim() || ''
  const assessment =
    insights.fazit && insights.assessment && insights.fazit !== insights.assessment
      ? insights.assessment
      : !insights.fazit
        ? insights.assessment
        : undefined
  const tone = toneFromUi(insights.fazitTone)
  const findingCount = filterEqcMetaFindings(insights.findings).length
  const criticalCount = filterEqcMetaFindings(insights.findings).filter(
    (f) => f.severity === 'error',
  ).length

  return (
    <div className="plexon-eqc-insights-spread" data-section="eqc-insights-spread">
      <section
        className="plexon-eqc-spread-open"
        data-layout="main-first"
        aria-labelledby="eqc-insights-verdict-heading"
      >
        <div className="plexon-eqc-spread-open__main">
          <Text role="meta" as="p" className="plexon-eqc-geo-eyebrow">
            Verdict
          </Text>
          <Text role="title" as="h3" id="eqc-insights-verdict-heading">
            {EQC_REPORT_COPY.fazit}
            {domainLabel ? ` · ${domainLabel}` : ''}
          </Text>
          {verdict ? (
            <blockquote className="plexon-eqc-reading">
              <p className="plexon-eqc-reading__statement">{verdict}</p>
            </blockquote>
          ) : null}
          {assessment ? (
            <div className="plexon-eqc-spread-open__prose">
              {formatInsightProse(assessment).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          ) : null}
        </div>
        <aside className="plexon-eqc-spread-callout" data-tone={tone}>
          <Text role="meta" as="p" className="plexon-eqc-geo-eyebrow">
            Signale
          </Text>
          <p className="plexon-eqc-spread-callout__num">{findingCount || '—'}</p>
          <p className="plexon-eqc-spread-callout__label">
            {findingCount === 1 ? 'Erkenntnis' : 'Erkenntnisse'}
          </p>
          <p className="plexon-eqc-spread-callout__body">
            {criticalCount > 0
              ? `${criticalCount} kritisch — Details in den Erkenntnissen unten.`
              : findingCount > 0
                ? 'Priorisiert nach Schwere; konkrete Moves stehen bei GEO.'
                : 'Keine kritischen Signale in diesem Quick Check.'}
          </p>
        </aside>
      </section>

      {findingCount > 0 ? (
        <section className="plexon-eqc-insights" aria-labelledby="eqc-insights-ops-heading">
          <header className="plexon-eqc-insights__head">
            <Text role="meta" as="p" className="plexon-eqc-geo-eyebrow">
              Opportunities
            </Text>
            <Text role="title" as="h3" id="eqc-insights-ops-heading">
              {EQC_REPORT_COPY.sectionFindings}
            </Text>
            <p className="plexon-eqc-insights__lede">
              Was im Quick Check auffällt — priorisiert nach Schwere, nicht nach Länge.
            </p>
          </header>
          <FindingOps findings={insights.findings} />
        </section>
      ) : null}
    </div>
  )
}
