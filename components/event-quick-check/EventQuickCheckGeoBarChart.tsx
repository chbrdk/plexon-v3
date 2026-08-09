'use client'

import { Text } from '@msqdx/ui'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { EventQuickCheckGeoBarChartModel } from '@/lib/assistant/reports/event-quick-check/build-event-quick-check-geo-charts'
import {
  EQC_CHART_CURSOR,
  EQC_CHART_TICK,
  EQC_CHART_TICK_INK,
  EqcChartTooltip,
} from '@/components/event-quick-check/EqcChartTooltip'

type Props = {
  model: EventQuickCheckGeoBarChartModel
}

export function EventQuickCheckGeoBarChart({ model }: Props) {
  const rows = model.labels.map((label, index) => ({
    label,
    value: model.values[index] ?? 0,
  }))

  const barHeight = model.horizontal ? Math.min(360, 56 + rows.length * 34) : 240

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
      <div
        className={`plexon-eqc-chart${model.horizontal ? ' plexon-eqc-chart--ranked' : ''}`}
        style={{ height: barHeight }}
      >
        <ResponsiveContainer width="100%" height="100%">
          {model.horizontal ? (
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
              barCategoryGap="32%"
            >
              <CartesianGrid
                strokeDasharray="0"
                stroke="var(--line)"
                strokeOpacity={0.7}
                horizontal={false}
                vertical
              />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={EQC_CHART_TICK}
                axisLine={{ stroke: 'var(--line)' }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={Math.min(220, 96 + Math.max(...rows.map((r) => r.label.length)) * 4)}
                tick={EQC_CHART_TICK_INK}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={EQC_CHART_CURSOR}
                content={({ active, label, payload }) => (
                  <EqcChartTooltip
                    active={active}
                    label={typeof label === 'string' ? label : undefined}
                    rows={[
                      {
                        name: model.valueLabel,
                        value: String(payload?.[0]?.value ?? 0),
                      },
                    ]}
                  />
                )}
              />
              <Bar
                dataKey="value"
                fill="var(--accent, var(--color-secondary-dx-green, #00ca55))"
                radius={0}
                maxBarSize={14}
                isAnimationActive={false}
              />
            </BarChart>
          ) : (
            <BarChart data={rows} margin={{ top: 12, right: 4, left: 0, bottom: 4 }}>
              <CartesianGrid
                vertical={false}
                stroke="var(--line)"
                strokeOpacity={0.7}
                strokeDasharray="0"
              />
              <XAxis
                dataKey="label"
                tick={EQC_CHART_TICK_INK}
                axisLine={{ stroke: 'var(--line)' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                width={36}
                tick={EQC_CHART_TICK}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={EQC_CHART_CURSOR}
                content={({ active, label, payload }) => (
                  <EqcChartTooltip
                    active={active}
                    label={typeof label === 'string' ? label : undefined}
                    rows={[
                      {
                        name: model.valueLabel,
                        value: String(payload?.[0]?.value ?? 0),
                      },
                    ]}
                  />
                )}
              />
              <Bar
                dataKey="value"
                fill="var(--accent, var(--color-secondary-dx-green, #00ca55))"
                radius={0}
                maxBarSize={36}
                isAnimationActive={false}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
