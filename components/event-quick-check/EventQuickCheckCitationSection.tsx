'use client'

import { useEffect, useMemo, useState } from 'react'
import { Text } from '@msqdx/ui'
import { EventQuickCheckCitationCompetitorChart } from '@/components/event-quick-check/EventQuickCheckCitationCompetitorChart'
import { EventQuickCheckGeoBarChart } from '@/components/event-quick-check/EventQuickCheckGeoBarChart'
import type {
  EventQuickCheckReportCitationModelSlice,
  EventQuickCheckReportCitationQueryRun,
} from '@/lib/assistant/reports/event-quick-check-report-types'
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy'
import {
  buildCitationCompetitorChart,
  buildCitationPositionChart,
  buildOwnDomainMultiModelChart,
} from '@/lib/assistant/reports/event-quick-check/build-event-quick-check-geo-charts'
import { formatGeoLlmAnswerForDisplay } from '@/lib/integrations/format-geo-llm-answer'
import { normalizeGeoDomain } from '@/lib/integrations/normalize-geo-domain'

type Props = {
  citationHighlights: Array<{ query: string; domain: string; position: number }>
  citationHighlightsByModel?: EventQuickCheckReportCitationModelSlice[]
  ownDomain?: string
  knownCompetitors?: string[]
}

type ModelRunCell = {
  modelId: string
  modelLabel: string
  run: EventQuickCheckReportCitationQueryRun
  position: number | null
}

type PromptCluster = {
  query: string
  models: ModelRunCell[]
}

function resolveCitationModelSlices(
  citationHighlights: Props['citationHighlights'],
  citationHighlightsByModel?: EventQuickCheckReportCitationModelSlice[]
): EventQuickCheckReportCitationModelSlice[] {
  if (citationHighlightsByModel?.length) return citationHighlightsByModel
  if (citationHighlights.length === 0) return []
  return [
    {
      modelId: 'all',
      modelLabel: EQC_REPORT_COPY.geoModelAllLabel,
      citations: citationHighlights,
      runs: citationHighlights.map((c) => ({
        query: c.query,
        citations: [{ domain: c.domain, position: c.position }],
      })),
    },
  ]
}

function resolveRunsForSlice(
  slice: EventQuickCheckReportCitationModelSlice
): EventQuickCheckReportCitationQueryRun[] {
  if (slice.runs?.length) return slice.runs
  return slice.citations.map((c) => ({
    query: c.query,
    citations: [{ domain: c.domain, position: c.position }],
  }))
}

function ownPositionInRun(
  run: EventQuickCheckReportCitationQueryRun,
  ownHost: string
): number | null {
  const host = normalizeGeoDomain(ownHost)
  if (!host) return null
  const hit = run.citations.find((c) => normalizeGeoDomain(c.domain) === host)
  if (!hit || hit.position < 1) return null
  return hit.position
}

function ownAvgPosition(
  slice: EventQuickCheckReportCitationModelSlice,
  ownHost: string
): number | null {
  const runs = resolveRunsForSlice(slice)
  const positions: number[] = []
  for (const run of runs) {
    const pos = ownPositionInRun(run, ownHost)
    if (pos != null) positions.push(pos)
  }
  if (!positions.length) return null
  return Math.round((positions.reduce((a, b) => a + b, 0) / positions.length) * 10) / 10
}

function buildPromptClusters(
  slices: EventQuickCheckReportCitationModelSlice[],
  ownHost: string
): PromptCluster[] {
  const byQuery = new Map<string, ModelRunCell[]>()
  for (const slice of slices) {
    for (const run of resolveRunsForSlice(slice)) {
      const query = run.query.trim()
      if (!query) continue
      const list = byQuery.get(query) ?? []
      list.push({
        modelId: slice.modelId,
        modelLabel: slice.modelLabel,
        run,
        position: ownPositionInRun(run, ownHost),
      })
      byQuery.set(query, list)
    }
  }
  return [...byQuery.entries()].map(([query, models]) => ({ query, models }))
}

/** Prompt dossier + model strip + inline answers (Checkion GEO magazine pattern). */
export function EventQuickCheckCitationSection({
  citationHighlights,
  citationHighlightsByModel,
  ownDomain = '',
  knownCompetitors = [],
}: Props) {
  const slices = useMemo(
    () => resolveCitationModelSlices(citationHighlights, citationHighlightsByModel),
    [citationHighlights, citationHighlightsByModel]
  )
  const ownHost = normalizeGeoDomain(ownDomain)
  const clusters = useMemo(() => buildPromptClusters(slices, ownHost), [slices, ownHost])

  const [activeQuery, setActiveQuery] = useState(clusters[0]?.query ?? '')
  const [activeModelId, setActiveModelId] = useState(clusters[0]?.models[0]?.modelId ?? '')

  useEffect(() => {
    if (!clusters.some((c) => c.query === activeQuery)) {
      setActiveQuery(clusters[0]?.query ?? '')
    }
  }, [clusters, activeQuery])

  const activeCluster =
    clusters.find((c) => c.query === activeQuery) ?? clusters[0] ?? null

  useEffect(() => {
    if (!activeCluster) {
      setActiveModelId('')
      return
    }
    if (!activeCluster.models.some((m) => m.modelId === activeModelId)) {
      setActiveModelId(activeCluster.models[0]?.modelId ?? '')
    }
  }, [activeCluster, activeModelId])

  const activeCell =
    activeCluster?.models.find((m) => m.modelId === activeModelId) ??
    activeCluster?.models[0] ??
    null

  const multiModelChart = useMemo(
    () => buildOwnDomainMultiModelChart(slices, ownDomain),
    [slices, ownDomain]
  )

  const overviewSlice = slices.find((s) => s.modelId === activeModelId) ?? slices[0]
  const overviewRuns = overviewSlice ? resolveRunsForSlice(overviewSlice) : []
  const competitorChart = overviewSlice
    ? buildCitationCompetitorChart(overviewRuns, ownDomain, knownCompetitors)
    : null
  const hasCompetitorSeries = Boolean(competitorChart?.series.some((s) => !s.isOwn))
  const simpleChart =
    !multiModelChart && !hasCompetitorSeries && overviewSlice
      ? buildCitationPositionChart(overviewSlice.citations)
      : null

  const citedInActive = activeCluster
    ? activeCluster.models.filter((m) => m.position != null).length
    : 0

  if (
    !slices.length &&
    !multiModelChart &&
    !competitorChart &&
    !simpleChart &&
    !clusters.length
  ) {
    return null
  }

  const answerText = activeCell ? formatGeoLlmAnswerForDisplay(activeCell.run) : ''

  return (
    <div className="plexon-eqc-geo-placement" data-section="eqc-geo-placement">
      {slices.length > 1 ? (
        <div className="plexon-eqc-geo-models plexon-eqc-geo-models--overview">
          <div className="plexon-eqc-geo-models__head">
            <Text role="meta" as="p" className="plexon-eqc-geo-eyebrow">
              {EQC_REPORT_COPY.geoModelSwitcherLabel}
            </Text>
            <span className="plexon-eqc-geo-models__count">
              {slices.length} {slices.length === 1 ? 'Modell' : 'Modelle'}
            </span>
          </div>
          <ul
            className="plexon-eqc-geo-models__strip"
            aria-label={EQC_REPORT_COPY.geoModelSwitcherLabel}
          >
            {slices.map((slice) => {
              const avg = ownAvgPosition(slice, ownHost)
              const miss = avg == null
              return (
                <li key={slice.modelId}>
                  <div
                    className="plexon-eqc-geo-models__cell plexon-eqc-geo-models__cell--static"
                    data-miss={miss ? 'true' : undefined}
                    title={slice.modelLabel}
                  >
                    <span className="plexon-eqc-geo-models__id">{slice.modelLabel}</span>
                    <span
                      className="plexon-eqc-geo-models__rank"
                      data-miss={miss ? 'true' : undefined}
                    >
                      {miss ? '—' : `#${avg}`}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {multiModelChart ? (
        <EventQuickCheckCitationCompetitorChart model={multiModelChart} />
      ) : hasCompetitorSeries && competitorChart ? (
        <EventQuickCheckCitationCompetitorChart model={competitorChart} />
      ) : simpleChart ? (
        <EventQuickCheckGeoBarChart model={simpleChart} />
      ) : null}

      {clusters.length > 0 ? (
        <section className="plexon-eqc-geo-dossier" aria-label={EQC_REPORT_COPY.geoPromptsLabel}>
          <nav className="plexon-eqc-geo-dossier__index" aria-label={EQC_REPORT_COPY.geoPromptsLabel}>
            <Text role="meta" as="p" className="plexon-eqc-geo-eyebrow">
              {EQC_REPORT_COPY.geoPromptsLabel}
            </Text>
            <ol className="plexon-eqc-geo-dossier__nav">
              {clusters.map((cluster, i) => {
                const selected = cluster.query === (activeCluster?.query ?? null)
                const hits = cluster.models.filter((m) => m.position != null).length
                return (
                  <li key={cluster.query}>
                    <button
                      type="button"
                      className="plexon-eqc-geo-dossier__nav-btn"
                      data-active={selected ? 'true' : undefined}
                      aria-current={selected ? 'true' : undefined}
                      onClick={() => setActiveQuery(cluster.query)}
                    >
                      <span className="plexon-eqc-geo-dossier__nav-idx" aria-hidden>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="plexon-eqc-geo-dossier__nav-q">{cluster.query}</span>
                      <span className="plexon-eqc-geo-dossier__nav-out">
                        {hits}/{cluster.models.length}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </nav>

          {activeCluster ? (
            <div className="plexon-eqc-geo-dossier__detail" key={activeCluster.query}>
              <header className="plexon-eqc-geo-dossier__head">
                <div className="plexon-eqc-geo-dossier__meta">
                  <span className="plexon-eqc-geo-dossier__cite">
                    {citedInActive}/{activeCluster.models.length} {EQC_REPORT_COPY.geoCiteYouCount}
                  </span>
                </div>
                <h3 className="plexon-eqc-geo-dossier__prompt">{activeCluster.query}</h3>
              </header>

              <div className="plexon-eqc-geo-models">
                <div className="plexon-eqc-geo-models__head">
                  <Text role="meta" as="p" className="plexon-eqc-geo-eyebrow">
                    {EQC_REPORT_COPY.geoModelSwitcherLabel}
                  </Text>
                  <span className="plexon-eqc-geo-models__count">
                    {activeCluster.models.length}{' '}
                    {activeCluster.models.length === 1 ? 'Modell' : 'Modelle'}
                  </span>
                </div>
                <ul
                  className="plexon-eqc-geo-models__strip"
                  aria-label={EQC_REPORT_COPY.geoModelSwitcherLabel}
                >
                  {activeCluster.models.map((cell) => {
                    const selected = cell.modelId === activeCell?.modelId
                    const miss = cell.position == null
                    return (
                      <li key={cell.modelId}>
                        <button
                          type="button"
                          className="plexon-eqc-geo-models__cell"
                          data-active={selected ? 'true' : undefined}
                          data-miss={miss ? 'true' : undefined}
                          aria-pressed={selected}
                          aria-label={`${cell.modelLabel}: ${
                            miss
                              ? EQC_REPORT_COPY.geoPositionNotCited
                              : `Position ${cell.position}`
                          }`}
                          title={cell.modelLabel}
                          onClick={() => setActiveModelId(cell.modelId)}
                        >
                          <span className="plexon-eqc-geo-models__id">{cell.modelLabel}</span>
                          <span
                            className="plexon-eqc-geo-models__rank"
                            data-miss={miss ? 'true' : undefined}
                          >
                            {miss ? '—' : `#${cell.position}`}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>

              <div className="plexon-eqc-geo-dossier__answers">
                <Text role="meta" as="p" className="plexon-eqc-geo-eyebrow">
                  {EQC_REPORT_COPY.geoAnswerLabel}
                </Text>
                {activeCell ? (
                  <article
                    className="plexon-eqc-geo-answer"
                    data-miss={activeCell.position == null ? 'true' : undefined}
                  >
                    <header className="plexon-eqc-geo-answer__head">
                      <span className="plexon-eqc-geo-answer__model">{activeCell.modelLabel}</span>
                      <span
                        className="plexon-eqc-geo-answer__pos"
                        data-miss={activeCell.position == null ? 'true' : undefined}
                      >
                        {activeCell.position == null
                          ? EQC_REPORT_COPY.geoPositionNotCited
                          : `#${activeCell.position}`}
                      </span>
                    </header>
                    <blockquote className="plexon-eqc-geo-answer__prose">
                      {answerText || EQC_REPORT_COPY.geoLlmAnswerMissing}
                    </blockquote>
                    {activeCell.run.citations.length > 0 ? (
                      <div className="plexon-eqc-geo-answer__cites">
                        <p className="plexon-eqc-geo-answer__cites-k">
                          {EQC_REPORT_COPY.geoCiteStackLabel}
                        </p>
                        <ol
                          className="plexon-eqc-geo-answer__rail"
                          aria-label={EQC_REPORT_COPY.geoCiteStackLabel}
                        >
                          {[...activeCell.run.citations]
                            .sort((a, b) => a.position - b.position)
                            .map((c) => {
                              const host = normalizeGeoDomain(c.domain)
                              const role =
                                ownHost && host === ownHost
                                  ? 'you'
                                  : knownCompetitors.some(
                                        (k) => normalizeGeoDomain(k) === host
                                      )
                                    ? 'rival'
                                    : 'other'
                              return (
                                <li key={`${c.domain}-${c.position}`} data-role={role}>
                                  <span className="plexon-eqc-geo-answer__rail-pos">
                                    {c.position}
                                  </span>
                                  <span className="plexon-eqc-geo-answer__rail-host">
                                    {c.domain}
                                  </span>
                                  {c.context ? (
                                    <span className="plexon-eqc-geo-answer__rail-ctx">
                                      {c.context}
                                    </span>
                                  ) : null}
                                </li>
                              )
                            })}
                        </ol>
                      </div>
                    ) : (
                      <p className="plexon-eqc-geo-answer__empty">
                        {EQC_REPORT_COPY.geoNoCitationsInAnswer}
                      </p>
                    )}
                  </article>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
