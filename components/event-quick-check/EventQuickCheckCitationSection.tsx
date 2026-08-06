'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button, DataTable, Text } from '@msqdx/ui'
import { EventQuickCheckCitationCompetitorChart } from '@/components/event-quick-check/EventQuickCheckCitationCompetitorChart'
import { EventQuickCheckGeoBarChart } from '@/components/event-quick-check/EventQuickCheckGeoBarChart'
import { EventQuickCheckLlmAnswerDialog } from '@/components/event-quick-check/EventQuickCheckLlmAnswerDialog'
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
import { normalizeGeoDomain } from '@/lib/integrations/normalize-geo-domain'

type Props = {
  citationHighlights: Array<{ query: string; domain: string; position: number }>
  citationHighlightsByModel?: EventQuickCheckReportCitationModelSlice[]
  ownDomain?: string
  knownCompetitors?: string[]
}

type CitationRow = {
  id: string
  query: string
  domain: string
  position: number
  run?: EventQuickCheckReportCitationQueryRun
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

function findRunForHighlight(
  runs: EventQuickCheckReportCitationQueryRun[],
  highlight: { query: string; domain: string; position: number }
): EventQuickCheckReportCitationQueryRun | undefined {
  return (
    runs.find(
      (run) =>
        run.query === highlight.query &&
        run.citations.some(
          (c) =>
            c.domain === highlight.domain &&
            c.position === highlight.position &&
            normalizeGeoDomain(c.domain) === normalizeGeoDomain(highlight.domain)
        )
    ) ?? runs.find((run) => run.query === highlight.query)
  )
}

function ownAvgPosition(
  slice: EventQuickCheckReportCitationModelSlice,
  ownHost: string
): number | null {
  const host = normalizeGeoDomain(ownHost)
  if (!host) return null
  const runs = resolveRunsForSlice(slice)
  const positions: number[] = []
  for (const run of runs) {
    const hit = run.citations.find((c) => normalizeGeoDomain(c.domain) === host)
    if (hit && hit.position >= 1) positions.push(hit.position)
  }
  if (!positions.length) return null
  return Math.round((positions.reduce((a, b) => a + b, 0) / positions.length) * 10) / 10
}

/** Model strip + ranking (Checkion GEO pattern) — always visible when slices exist. */
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

  const [activeModelId, setActiveModelId] = useState(slices[0]?.modelId ?? '')
  const [dialogRun, setDialogRun] = useState<EventQuickCheckReportCitationQueryRun | null>(null)

  useEffect(() => {
    if (!slices.some((s) => s.modelId === activeModelId)) {
      setActiveModelId(slices[0]?.modelId ?? '')
    }
  }, [slices, activeModelId])

  const activeSlice = slices.find((s) => s.modelId === activeModelId) ?? slices[0]
  const activeRuns = activeSlice ? resolveRunsForSlice(activeSlice) : []

  const multiModelChart = useMemo(
    () => buildOwnDomainMultiModelChart(slices, ownDomain),
    [slices, ownDomain]
  )
  const competitorChart = activeSlice
    ? buildCitationCompetitorChart(activeRuns, ownDomain, knownCompetitors)
    : null
  const hasCompetitorSeries = Boolean(competitorChart?.series.some((s) => !s.isOwn))
  const simpleChart =
    !multiModelChart && !hasCompetitorSeries && activeSlice
      ? buildCitationPositionChart(activeSlice.citations)
      : null

  const tableRows: CitationRow[] = useMemo(() => {
    if (!activeSlice) return []
    return activeSlice.citations.map((citation, index) => ({
      id: `${citation.query}-${citation.domain}-${index}`,
      query: citation.query,
      domain: citation.domain,
      position: citation.position,
      run: findRunForHighlight(activeRuns, citation),
    }))
  }, [activeSlice, activeRuns])

  if (!activeSlice || (!multiModelChart && !competitorChart && !simpleChart && !tableRows.length)) {
    return null
  }

  return (
    <div className="plexon-eqc-geo-placement" data-section="eqc-geo-placement">
      {slices.length > 0 ? (
        <div className="plexon-eqc-geo-models">
          <div className="plexon-eqc-geo-models__head">
            <Text role="meta" as="p" className="plexon-eqc-geo-eyebrow">
              {EQC_REPORT_COPY.geoModelSwitcherLabel}
            </Text>
            <span className="plexon-eqc-geo-models__count">
              {slices.length} {slices.length === 1 ? 'Modell' : 'Modelle'}
            </span>
          </div>
          <ul className="plexon-eqc-geo-models__strip" aria-label={EQC_REPORT_COPY.geoModelSwitcherLabel}>
            {slices.map((slice) => {
              const selected = slice.modelId === activeSlice.modelId
              const avg = ownAvgPosition(slice, ownDomain)
              const miss = avg == null
              return (
                <li key={slice.modelId}>
                  <button
                    type="button"
                    className="plexon-eqc-geo-models__cell"
                    data-active={selected ? 'true' : undefined}
                    data-miss={miss ? 'true' : undefined}
                    aria-pressed={selected}
                    aria-label={`${slice.modelLabel}: ${miss ? 'nicht zitiert' : `Ø Position ${avg}`}`}
                    title={slice.modelLabel}
                    onClick={() => setActiveModelId(slice.modelId)}
                  >
                    <span className="plexon-eqc-geo-models__id">{slice.modelLabel}</span>
                    <span className="plexon-eqc-geo-models__rank" data-miss={miss ? 'true' : undefined}>
                      {miss ? '—' : `#${avg}`}
                    </span>
                  </button>
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

      {tableRows.length > 0 ? (
        <div className="plexon-eqc-chart-block">
          <Text role="label" as="h4" className="plexon-eqc-chart-title">
            {EQC_REPORT_COPY.sectionCitations}
            {activeSlice ? ` · ${activeSlice.modelLabel}` : ''}
          </Text>
          <DataTable
            caption={EQC_REPORT_COPY.geoViewLlmAnswer}
            getRowId={(row) => row.id}
            rows={tableRows}
            columns={[
              {
                id: 'query',
                header: EQC_REPORT_COPY.colQuery,
                cell: (row) => row.query,
                sortValue: (row) => row.query,
              },
              {
                id: 'domain',
                header: EQC_REPORT_COPY.colDomain,
                cell: (row) => row.domain,
                sortValue: (row) => row.domain,
              },
              {
                id: 'position',
                header: EQC_REPORT_COPY.colPosition,
                cell: (row) => row.position,
                sortValue: (row) => row.position,
                align: 'end',
              },
              {
                id: 'answer',
                header: EQC_REPORT_COPY.geoViewLlmAnswer,
                cell: (row) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={EQC_REPORT_COPY.geoViewLlmAnswer}
                    disabled={!row.run}
                    onClick={() => row.run && setDialogRun(row.run)}
                  >
                    ↗
                  </Button>
                ),
              },
            ]}
          />
        </div>
      ) : null}

      <EventQuickCheckLlmAnswerDialog
        open={dialogRun != null}
        onClose={() => setDialogRun(null)}
        run={dialogRun}
        modelLabel={activeSlice.modelLabel}
      />
    </div>
  )
}
