'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Chip, Text } from '@msqdx/ui';
import { EventQuickCheckCitationCompetitorChart } from '@/components/event-quick-check/EventQuickCheckCitationCompetitorChart';
import { EventQuickCheckGeoBarChart } from '@/components/event-quick-check/EventQuickCheckGeoBarChart';
import { EventQuickCheckLlmAnswerDialog } from '@/components/event-quick-check/EventQuickCheckLlmAnswerDialog';
import type {
  EventQuickCheckReportCitationModelSlice,
  EventQuickCheckReportCitationQueryRun,
} from '@/lib/assistant/reports/event-quick-check-report-types';
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy';
import {
  buildCitationCompetitorChart,
  buildCitationPositionChart,
} from '@/lib/assistant/reports/event-quick-check/build-event-quick-check-geo-charts';
import { normalizeGeoDomain } from '@/lib/integrations/normalize-geo-domain';

type Props = {
  citationHighlights: Array<{ query: string; domain: string; position: number }>;
  citationHighlightsByModel?: EventQuickCheckReportCitationModelSlice[];
  ownDomain?: string;
  knownCompetitors?: string[];
};

function resolveCitationModelSlices(
  citationHighlights: Props['citationHighlights'],
  citationHighlightsByModel?: EventQuickCheckReportCitationModelSlice[]
): EventQuickCheckReportCitationModelSlice[] {
  if (citationHighlightsByModel?.length) return citationHighlightsByModel;
  if (citationHighlights.length === 0) return [];
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
  ];
}

function resolveRunsForSlice(slice: EventQuickCheckReportCitationModelSlice): EventQuickCheckReportCitationQueryRun[] {
  if (slice.runs?.length) return slice.runs;
  return slice.citations.map((c) => ({
    query: c.query,
    citations: [{ domain: c.domain, position: c.position }],
  }));
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
  );
}

export function EventQuickCheckCitationSection({
  citationHighlights,
  citationHighlightsByModel,
  ownDomain = '',
  knownCompetitors = [],
}: Props) {
  const slices = useMemo(
    () => resolveCitationModelSlices(citationHighlights, citationHighlightsByModel),
    [citationHighlights, citationHighlightsByModel]
  );

  const [activeModelId, setActiveModelId] = useState(slices[0]?.modelId ?? '');
  const [dialogRun, setDialogRun] = useState<EventQuickCheckReportCitationQueryRun | null>(null);

  useEffect(() => {
    if (!slices.some((s) => s.modelId === activeModelId)) {
      setActiveModelId(slices[0]?.modelId ?? '');
    }
  }, [slices, activeModelId]);

  const activeSlice = slices.find((s) => s.modelId === activeModelId) ?? slices[0];
  const activeRuns = activeSlice ? resolveRunsForSlice(activeSlice) : [];
  const competitorChart = activeSlice
    ? buildCitationCompetitorChart(activeRuns, ownDomain, knownCompetitors)
    : null;
  const simpleChart =
    !competitorChart?.series.some((s) => !s.isOwn) && activeSlice
      ? buildCitationPositionChart(activeSlice.citations)
      : null;

  if (!activeSlice || (!competitorChart && !simpleChart)) return null;

  return (
    <>
      <div className="plexon-eqc-stack-sm">
        {slices.length > 1 ? (
          <div className="plexon-eqc-chip-row">
            <Chip static size="sm">
              {EQC_REPORT_COPY.geoModelSwitcherLabel}
            </Chip>
            {slices.map((slice) => {
              const selected = slice.modelId === activeSlice.modelId;
              return (
                <Chip
                  key={slice.modelId}
                  size="sm"
                  selected={selected}
                  onClick={() => setActiveModelId(slice.modelId)}
                >
                  {slice.modelLabel}
                </Chip>
              );
            })}
          </div>
        ) : null}

        {competitorChart ? (
          <EventQuickCheckCitationCompetitorChart model={competitorChart} />
        ) : simpleChart ? (
          <EventQuickCheckGeoBarChart model={simpleChart} />
        ) : null}

        <div className="plexon-eqc-chart-block">
          <Text role="label" as="h4" className="plexon-eqc-chart-title">
            {EQC_REPORT_COPY.sectionCitations}
          </Text>
          <div className="plexon-eqc-citation-table-wrap">
            <table className="plexon-eqc-citation-table">
              <thead>
                <tr>
                  <th>{EQC_REPORT_COPY.colQuery}</th>
                  <th>{EQC_REPORT_COPY.colDomain}</th>
                  <th>{EQC_REPORT_COPY.colPosition}</th>
                  <th aria-label={EQC_REPORT_COPY.geoViewLlmAnswer} />
                </tr>
              </thead>
              <tbody>
                {activeSlice.citations.map((citation, index) => {
                  const run = findRunForHighlight(activeRuns, citation);
                  return (
                    <tr
                      key={`${citation.query}-${index}`}
                      onClick={() => run && setDialogRun(run)}
                    >
                      <td>{citation.query}</td>
                      <td>{citation.domain}</td>
                      <td>{citation.position}</td>
                      <td>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={EQC_REPORT_COPY.geoViewLlmAnswer}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (run) setDialogRun(run);
                          }}
                        >
                          ↗
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Text role="hint">{EQC_REPORT_COPY.geoViewLlmAnswer}</Text>
          </div>
        </div>
      </div>

      <EventQuickCheckLlmAnswerDialog
        open={dialogRun != null}
        onClose={() => setDialogRun(null)}
        run={dialogRun}
        modelLabel={activeSlice.modelLabel}
      />
    </>
  );
}
