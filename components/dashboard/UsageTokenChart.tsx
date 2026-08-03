'use client'

import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'

export type UsageChartRange = 'day' | 'month' | 'year'

export type UsageByDayPoint = { date: string; tokens: number }
export type UsageByMonthPoint = { period: string; tokens: number }
export type UsageByYearPoint = { year: string; tokens: number }

type ChartRow = {
  key: string
  label: string
  tokens: number
}

type Props = {
  range: UsageChartRange
  onRangeChange: (range: UsageChartRange) => void
  byDay: UsageByDayPoint[]
  byMonth: UsageByMonthPoint[]
  byYear: UsageByYearPoint[]
}

function utcToday(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function formatDayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function formatDayLabel(isoDate: string, locale: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return isoDate.slice(5) || isoDate
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

function formatMonthLabel(period: string, locale: string): string {
  const [y, m] = period.split('-').map(Number)
  if (!y || !m) return period
  const d = new Date(Date.UTC(y, m - 1, 1))
  return d.toLocaleDateString(locale, { month: 'short', year: '2-digit' })
}

/** Fill last `days` calendar days so sparse usage still reads as a timeline. */
export function padUsageDays(
  points: UsageByDayPoint[],
  days = 30,
  locale = 'en'
): ChartRow[] {
  const map = new Map(points.map((p) => [p.date, p.tokens]))
  const end = utcToday()
  const rows: ChartRow[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setUTCDate(end.getUTCDate() - i)
    const key = formatDayKey(d)
    rows.push({
      key,
      label: formatDayLabel(key, locale),
      tokens: map.get(key) ?? 0,
    })
  }
  return rows
}

/** Fill last `months` calendar months (YYYY-MM). */
export function padUsageMonths(
  points: UsageByMonthPoint[],
  months = 12,
  locale = 'en'
): ChartRow[] {
  const map = new Map(points.map((p) => [p.period, p.tokens]))
  const end = utcToday()
  const rows: ChartRow[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - i, 1))
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    rows.push({
      key,
      label: formatMonthLabel(key, locale),
      tokens: map.get(key) ?? 0,
    })
  }
  return rows
}

function UsageChartTooltip({
  active,
  payload,
  label,
  tokensLabel,
}: {
  active?: boolean
  payload?: Array<{ value?: number }>
  label?: string
  tokensLabel: string
}) {
  if (!active || !payload?.length) return null
  const value = Number(payload[0]?.value ?? 0)
  return (
    <div className="plexon-dash-chart-tooltip">
      <Text role="meta">{label}</Text>
      <Text role="title">
        {value.toLocaleString()} {tokensLabel}
      </Text>
    </div>
  )
}

export function UsageTokenChart({ range, onRangeChange, byDay, byMonth, byYear }: Props) {
  const { t, locale } = useI18n()
  const loc = locale === 'de' ? 'de-DE' : 'en-US'

  const chartData = useMemo(() => {
    if (range === 'day') return padUsageDays(byDay, 30, loc)
    if (range === 'month') return padUsageMonths(byMonth, 12, loc)
    return byYear.map((d) => ({
      key: d.year,
      label: d.year,
      tokens: d.tokens,
    }))
  }, [byDay, byMonth, byYear, loc, range])

  const total = useMemo(
    () => chartData.reduce((sum, row) => sum + row.tokens, 0),
    [chartData]
  )
  const hasData = chartData.some((d) => d.tokens > 0)
  const tickInterval =
    range === 'day' ? 4 : range === 'month' ? 0 : 0

  return (
    <div className="plexon-dash-subband plexon-usage-chart" data-section="usage-chart">
      <header className="plexon-usage-chart-head">
        <div>
          <Text role="title" as="h3" className="plexon-dash-subband-title">
            {t('dashboard.usageChart')}
          </Text>
          <Text role="meta" as="p" className="plexon-dash-subband-deck">
            {hasData
              ? t('dashboard.usageChartTotal', { n: total.toLocaleString() })
              : t('dashboard.usageNoData')}
          </Text>
        </div>
        <nav className="plexon-usage-chart-range" aria-label={t('dashboard.usageChart')}>
          {(['day', 'month', 'year'] as const).map((id) => (
            <button
              key={id}
              type="button"
              className="plexon-knowledge-toc-link"
              data-active={range === id ? 'true' : 'false'}
              onClick={() => onRangeChange(id)}
            >
              {id === 'day'
                ? t('dashboard.usageChartDay')
                : id === 'month'
                  ? t('dashboard.usageChartMonth')
                  : t('dashboard.usageChartYear')}
            </button>
          ))}
        </nav>
      </header>

      {hasData ? (
        <div className="plexon-dash-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 12, right: 4, left: 0, bottom: 4 }}>
              <CartesianGrid
                vertical={false}
                stroke="var(--line)"
                strokeOpacity={0.7}
                strokeDasharray="0"
              />
              <XAxis
                dataKey="label"
                interval={tickInterval}
                tick={{ fontSize: 11, fill: 'var(--muted)' }}
                axisLine={{ stroke: 'var(--line)' }}
                tickLine={false}
                minTickGap={8}
              />
              <YAxis
                allowDecimals={false}
                width={44}
                tick={{ fontSize: 11, fill: 'var(--muted)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'color-mix(in srgb, var(--ink) 6%, transparent)' }}
                content={(props) => (
                  <UsageChartTooltip
                    active={props.active}
                    payload={props.payload as Array<{ value?: number }> | undefined}
                    label={typeof props.label === 'string' ? props.label : undefined}
                    tokensLabel={t('dashboard.usageTokens')}
                  />
                )}
              />
              <Bar
                dataKey="tokens"
                fill="var(--accent, var(--color-secondary-dx-green, #00ca55))"
                radius={[0, 0, 0, 0]}
                maxBarSize={range === 'year' ? 48 : range === 'month' ? 28 : 18}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <Text role="meta" as="p" className="plexon-dash-band-status">
          {t('dashboard.usageNoData')}
        </Text>
      )}
    </div>
  )
}
