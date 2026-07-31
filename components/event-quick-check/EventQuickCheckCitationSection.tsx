'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Chip, IconButton, Stack, Typography } from '@mui/material';
import { MsqdxIcon } from '@msqdx/react';
import { MSQDX_SPACING, MSQDX_THEME, MSQDX_TYPOGRAPHY } from '@msqdx/tokens'
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
import { PLEXON_META_CHIP_SX } from '@/lib/theme-accent';
import { UI_BLOCK_ICONS, UI_FONT_SANS, uiMonoLabelSx } from '@/lib/assistant/ui-typography';
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface';

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

  const borderColor = MSQDX_THEME.light.border.default;
  const headerBg = `color-mix(in srgb, ${MSQDX_THEME.light.text.primary} 3%, transparent)`

  return (
    <>
      <Stack spacing={`${MSQDX_SPACING.scale.sm}px`}>
        {slices.length > 1 ? (
          <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap alignItems="center">
            <Chip
              size="small"
              label={EQC_REPORT_COPY.geoModelSwitcherLabel}
              variant="outlined"
              sx={{ ...PLEXON_META_CHIP_SX, pointerEvents: 'none' }}
            />
            {slices.map((slice) => {
              const selected = slice.modelId === activeSlice.modelId;
              return (
                <Chip
                  key={slice.modelId}
                  size="small"
                  label={slice.modelLabel}
                  variant={selected ? 'filled' : 'outlined'}
                  onClick={() => setActiveModelId(slice.modelId)}
                  sx={{
                    ...PLEXON_META_CHIP_SX,
                    ...(selected
                      ? {
                          bgcolor: 'var(--color-theme-accent) !important',
                          borderColor: 'var(--color-theme-accent) !important',
                          color: 'var(--color-theme-accent-contrast, #000) !important',
                          '& .MuiChip-label': {
                            color: 'var(--color-theme-accent-contrast, #000) !important',
                          },
                        }
                      : {}),
                  }}
                />
              );
            })}
          </Stack>
        ) : null}

        {competitorChart ? (
          <EventQuickCheckCitationCompetitorChart model={competitorChart} />
        ) : simpleChart ? (
          <EventQuickCheckGeoBarChart model={simpleChart} />
        ) : null}

        <UiBlockSurface title={EQC_REPORT_COPY.sectionCitations} icon={UI_BLOCK_ICONS.data_table} noPadding>
          <Box sx={{ overflowX: 'auto', p: `${MSQDX_SPACING.scale.md}px` }}>
            <Box
              component="table"
              sx={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: MSQDX_TYPOGRAPHY.fontFamily.primary,
                fontSize: MSQDX_TYPOGRAPHY.fontSize.sm,
                color: 'var(--color-text-on-light)',
                '& th, & td': {
                  border: `1px solid ${borderColor}`,
                  px: `${MSQDX_SPACING.scale.sm}px`,
                  py: `${MSQDX_SPACING.scale.xs}px`,
                  textAlign: 'left',
                },
                '& th': {
                  bgcolor: headerBg,
                  ...uiMonoLabelSx,
                  fontSize: MSQDX_TYPOGRAPHY.fontSize.xs,
                },
                '& td': {
                  fontFamily: UI_FONT_SANS,
                },
                '& tbody tr': {
                  cursor: 'pointer',
                },
                '& tbody tr:hover td': {
                  bgcolor: `color-mix(in srgb, ${MSQDX_THEME.light.text.primary} 4%, transparent)`,
                },
              }}
            >
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
                        <IconButton
                          size="small"
                          aria-label={EQC_REPORT_COPY.geoViewLlmAnswer}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (run) setDialogRun(run);
                          }}
                        >
                          <MsqdxIcon name="visibility" />
                        </IconButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {EQC_REPORT_COPY.geoViewLlmAnswer}
            </Typography>
          </Box>
        </UiBlockSurface>
      </Stack>

      <EventQuickCheckLlmAnswerDialog
        open={dialogRun != null}
        onClose={() => setDialogRun(null)}
        run={dialogRun}
        modelLabel={activeSlice.modelLabel}
      />
    </>
  );
}
