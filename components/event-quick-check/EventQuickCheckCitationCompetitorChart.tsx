'use client'

import { Text } from '@msqdx/ui'
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
} from 'recharts'
import type { CitationCompetitorChartModel } from '@/lib/assistant/reports/event-quick-check/build-event-quick-check-geo-charts'
import { citationCompetitorChartColor } from '@/lib/assistant/reports/event-quick-check/build-event-quick-check-geo-charts'
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy'
import {
  EQC_CHART_CURSOR,
  EQC_CHART_TICK,
  EQC_CHART_TICK_INK,
  EqcChartTooltip,
} from '@/components/event-quick-check/EqcChartTooltip'

type Props = {
  model: CitationCompetitorChartModel
}

export function EventQuickCheckCitationCompetitorChart({ model }: Props) {
  const barHeight = Math.min(420, 64 + model.rows.length * 40)

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
      <div className="plexon-eqc-chart plexon-eqc-chart--ranked" style={{ height: barHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={model.rows}
            layout="vertical"
            margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
            barCategoryGap="28%"
            barGap={3}
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
              domain={[0, model.maxPosition]}
              allowDecimals={false}
              tick={EQC_CHART_TICK}
              axisLine={{ stroke: 'var(--line)' }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="queryLabel"
              width={Math.min(
                220,
                96 + Math.max(...model.rows.map((r) => String(r.queryLabel).length)) * 4,
              )}
              tick={EQC_CHART_TICK_INK}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={EQC_CHART_CURSOR}
              content={({ active, payload, label }) => {
                const row = payload?.[0]?.payload as { queryText?: string } | undefined
                const tipLabel =
                  row?.queryText || (typeof label === 'string' ? label : undefined)
                const rows = (payload ?? []).map((entry) => {
                  const num = typeof entry.value === 'number' ? entry.value : 0
                  return {
                    name: String(entry.name ?? ''),
                    value: num
                      ? String(num)
                      : EQC_REPORT_COPY.geoPositionNotCited,
                  }
                })
                return <EqcChartTooltip active={active} label={tipLabel} rows={rows} />
              }}
            />
            <Legend
              verticalAlign="top"
              align="left"
              iconType="square"
              iconSize={8}
              wrapperStyle={{
                fontSize: 11,
                color: 'var(--muted)',
                fontFamily: 'var(--font-body, inherit)',
                paddingBottom: 8,
              }}
            />
            {model.series.map((series, index) => {
              const fill = citationCompetitorChartColor(index, series.isOwn)
              return (
                <Bar
                  key={series.key}
                  dataKey={series.key}
                  name={series.label}
                  fill={fill}
                  radius={0}
                  maxBarSize={12}
                  isAnimationActive={false}
                >
                  {model.rows.map((row, rowIndex) => {
                    const num =
                      typeof row[series.key] === 'number' ? (row[series.key] as number) : 0
                    return (
                      <Cell
                        key={`${series.key}-${rowIndex}`}
                        fill={
                          num > 0
                            ? fill
                            : 'color-mix(in srgb, var(--ink) 10%, transparent)'
                        }
                        opacity={num > 0 ? 1 : 0.45}
                      />
                    )
                  })}
                </Bar>
              )
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
