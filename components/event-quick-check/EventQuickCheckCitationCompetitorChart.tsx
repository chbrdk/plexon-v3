'use client';

import { Box, Typography } from '@mui/material';
import { MSQDX_COLORS, MSQDX_SPACING } from '@msqdx/tokens';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CitationCompetitorChartModel } from '@/lib/assistant/reports/event-quick-check/build-event-quick-check-geo-charts';
import { citationCompetitorChartColor } from '@/lib/assistant/reports/event-quick-check/build-event-quick-check-geo-charts';
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy';
import { UI_BLOCK_ICONS } from '@/lib/assistant/ui-typography';
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface';

type Props = {
  model: CitationCompetitorChartModel;
};

export function EventQuickCheckCitationCompetitorChart({ model }: Props) {
  const barHeight = Math.min(480, 56 + model.rows.length * 44);

  return (
    <UiBlockSurface title={model.title} icon={UI_BLOCK_ICONS.chart}>
      {model.subtitle ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {model.subtitle}
        </Typography>
      ) : null}
      <Box sx={{ width: '100%', height: barHeight, mt: `${MSQDX_SPACING.scale.xs}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={model.rows}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={MSQDX_COLORS.greyLight} horizontal={false} />
            <XAxis
              type="number"
              domain={[0, model.maxPosition]}
              allowDecimals={false}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="queryLabel"
              width={Math.min(
                280,
                120 + Math.max(...model.rows.map((r) => String(r.queryLabel).length)) * 3
              )}
              tick={{ fontSize: 11, fill: 'var(--color-text-on-light)' }}
            />
            <Tooltip
              formatter={(value, name) => {
                const num = typeof value === 'number' ? value : 0;
                if (!num) return [EQC_REPORT_COPY.geoPositionNotCited, name];
                return [num, name];
              }}
              labelFormatter={(_label, payload) => {
                const row = payload?.[0]?.payload as { queryText?: string } | undefined;
                return row?.queryText ?? '';
              }}
              labelStyle={{ color: 'var(--color-text-on-light)' }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} iconType="square" />
            {model.series.map((series, index) => {
              const fill = citationCompetitorChartColor(index);
              return (
                <Bar
                  key={series.key}
                  dataKey={series.key}
                  name={series.label}
                  fill={fill}
                  radius={[0, 4, 4, 0]}
                  maxBarSize={14}
                >
                  {model.rows.map((row, rowIndex) => {
                    const num = typeof row[series.key] === 'number' ? (row[series.key] as number) : 0;
                    return (
                      <Cell
                        key={`${series.key}-${rowIndex}`}
                        fill={num > 0 ? fill : MSQDX_COLORS.greyLight}
                        opacity={num > 0 ? 1 : 0.35}
                      />
                    );
                  })}
                </Bar>
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </UiBlockSurface>
  );
}
