'use client';

import { Box } from '@mui/material';
import { MSQDX_COLORS, MSQDX_SPACING } from '@msqdx/tokens';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { chartPropsSchema } from '@/lib/assistant/ui-blocks/schemas';
import type { z } from 'zod';
import { UI_BLOCK_ICONS } from '@/lib/assistant/ui-typography';
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface';

type Props = z.infer<typeof chartPropsSchema>;

const CHART_COLORS = [
  MSQDX_COLORS.brand.green,
  '#3b82f6',
  MSQDX_COLORS.brand.orange,
  MSQDX_COLORS.brand.pink,
];

export function UiChartBlock({
  title,
  chartType = 'bar',
  xAxisLabel,
  yAxisLabel,
  labels,
  datasets,
}: Props) {
  const rows = labels.map((label, index) => {
    const row: Record<string, string | number> = { label };
    for (const ds of datasets) {
      row[ds.label] = ds.values[index] ?? 0;
    }
    return row;
  });

  const ChartComponent = chartType === 'line' ? LineChart : BarChart;

  return (
    <UiBlockSurface title={title} icon={UI_BLOCK_ICONS.chart}>
      <Box sx={{ width: '100%', height: 260, mt: `${MSQDX_SPACING.scale.xs}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={MSQDX_COLORS.greyLight} />
            <XAxis dataKey="label" label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom' } : undefined} />
            <YAxis label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined} />
            <Tooltip />
            {datasets.length > 1 ? <Legend /> : null}
            {datasets.map((ds, i) =>
              chartType === 'line' ? (
                <Line
                  key={ds.label}
                  type="monotone"
                  dataKey={ds.label}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ) : (
                <Bar key={ds.label} dataKey={ds.label} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[8, 8, 0, 0]} />
              )
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </Box>
    </UiBlockSurface>
  );
}
