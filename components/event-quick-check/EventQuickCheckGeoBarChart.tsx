'use client';

import { Text } from '@msqdx/ui';
import { MSQDX_COLORS } from '@msqdx/tokens';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { EventQuickCheckGeoBarChartModel } from '@/lib/assistant/reports/event-quick-check/build-event-quick-check-geo-charts';

type Props = {
  model: EventQuickCheckGeoBarChartModel;
};

export function EventQuickCheckGeoBarChart({ model }: Props) {
  const rows = model.labels.map((label, index) => ({
    label,
    value: model.values[index] ?? 0,
  }));

  const barHeight = model.horizontal ? Math.min(420, 48 + rows.length * 36) : 260;

  return (
    <div className="plexon-eqc-chart-block">
      <Text role="label" as="h4" className="plexon-eqc-chart-title">
        {model.title}
      </Text>
      {model.subtitle ? (
        <Text role="hint" className="plexon-eqc-chart-subtitle">
          {model.subtitle}
        </Text>
      ) : null}
      <div className="plexon-eqc-chart" style={{ height: barHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          {model.horizontal ? (
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={MSQDX_COLORS.greyLight} horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="label"
                width={Math.min(280, 120 + Math.max(...rows.map((r) => r.label.length)) * 3)}
                tick={{ fontSize: 11, fill: 'var(--color-text-on-light)' }}
              />
              <Tooltip
                formatter={(value) => [value ?? 0, model.valueLabel]}
                labelStyle={{ color: 'var(--color-text-on-light)' }}
              />
              <Bar
                dataKey="value"
                fill="var(--color-theme-accent, var(--color-secondary-dx-green))"
                radius={[0, 6, 6, 0]}
                maxBarSize={22}
              />
            </BarChart>
          ) : (
            <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={MSQDX_COLORS.greyLight} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-on-light)' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value) => [value ?? 0, model.valueLabel]}
                labelStyle={{ color: 'var(--color-text-on-light)' }}
              />
              <Bar
                dataKey="value"
                fill="var(--color-theme-accent, var(--color-secondary-dx-green))"
                radius={[8, 8, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
