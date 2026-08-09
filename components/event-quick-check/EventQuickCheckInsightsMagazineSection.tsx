'use client'

import { useCallback, useId, useState } from 'react'
import { Text } from '@msqdx/ui'
import type {
  EventQuickCheckReportInsightFinding,
  EventQuickCheckReportInsightsSection,
  EventQuickCheckReportRecommendation,
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

function priorityTone(priority?: number): MagTone {
  if (priority == null) return 'low'
  if (priority <= 1) return 'neg'
  if (priority === 2) return 'low'
  return 'pos'
}

function priorityLabel(priority?: number): string {
  if (priority == null) return 'move'
  if (priority <= 1) return 'high'
  if (priority === 2) return 'medium'
  return 'low'
}

function MovesGallery({
  recommendations,
}: {
  recommendations: EventQuickCheckReportRecommendation[]
}) {
  const labelId = useId()
  const total = recommendations.length
  const [index, setIndex] = useState(0)
  const safeIndex = total === 0 ? 0 : Math.min(index, total - 1)
  const rec = recommendations[safeIndex]

  const go = useCallback(
    (dir: -1 | 1) => {
      if (total <= 1) return
      setIndex((i) => (i + dir + total) % total)
    },
    [total]
  )

  if (!rec || total === 0) return null

  const tone = priorityTone(rec.priority)

  return (
    <div
      className="plexon-eqc-moves__gallery"
      role="region"
      aria-roledescription="carousel"
      aria-labelledby={labelId}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          go(-1)
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          go(1)
        }
      }}
    >
      <div className="plexon-eqc-moves__toolbar">
        <p id={labelId} className="plexon-eqc-moves__count">
          <span className="plexon-eqc-moves__count-cur">
            {String(safeIndex + 1).padStart(2, '0')}
          </span>
          <span aria-hidden> / </span>
          <span>{String(total).padStart(2, '0')}</span>
        </p>
        {total > 1 ? (
          <div className="plexon-eqc-moves__controls">
            <button
              type="button"
              className="plexon-eqc-moves__ctrl"
              onClick={() => go(-1)}
              aria-label="Vorherige Empfehlung"
            >
              ←
            </button>
            <button
              type="button"
              className="plexon-eqc-moves__ctrl"
              onClick={() => go(1)}
              aria-label="Nächste Empfehlung"
            >
              →
            </button>
          </div>
        ) : null}
      </div>

      <article
        key={`${rec.title}-${safeIndex}`}
        className="plexon-eqc-moves__slide"
        data-tone={tone}
        aria-label={`Empfehlung ${safeIndex + 1} von ${total}`}
      >
        <div className="plexon-eqc-moves__slide-head">
          <span className="plexon-eqc-moves__idx" aria-hidden>
            {String(safeIndex + 1).padStart(2, '0')}
          </span>
          <div className="plexon-eqc-moves__meta">
            <span className="plexon-eqc-moves__sev">{priorityLabel(rec.priority)}</span>
            {rec.category ? (
              <span className="plexon-eqc-moves__src">{rec.category}</span>
            ) : null}
          </div>
        </div>
        <p className="plexon-eqc-moves__lead">
          <span className="plexon-eqc-moves__title">{rec.title}</span>
        </p>
        {rec.description ? <p className="plexon-eqc-moves__copy">{rec.description}</p> : null}
      </article>

      {total > 1 ? (
        <ol className="plexon-eqc-moves__ticks" aria-hidden>
          {recommendations.map((r, i) => (
            <li key={`${r.title}-${i}`}>
              <button
                type="button"
                className="plexon-eqc-moves__tick"
                data-active={i === safeIndex ? 'true' : undefined}
                onClick={() => setIndex(i)}
                tabIndex={-1}
                aria-label={`Zur Empfehlung ${i + 1}`}
              />
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  )
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
  const moveCount = insights.recommendations.length
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
              ? `${criticalCount} kritisch · ${moveCount} nächste Schritte`
              : moveCount > 0
                ? `${moveCount} nächste Schritte priorisiert`
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

      {moveCount > 0 ? (
        <section className="plexon-eqc-moves" aria-labelledby="eqc-insights-moves-heading">
          <header className="plexon-eqc-insights__head">
            <Text role="meta" as="p" className="plexon-eqc-geo-eyebrow">
              Next moves
            </Text>
            <Text role="title" as="h3" id="eqc-insights-moves-heading">
              Was zuerst ändern
            </Text>
          </header>
          <MovesGallery recommendations={insights.recommendations} />
        </section>
      ) : null}
    </div>
  )
}
