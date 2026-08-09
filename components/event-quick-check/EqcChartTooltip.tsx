'use client'

import { Text } from '@msqdx/ui'

/** Shared Recharts tooltip chrome — matches UsageTokenChart / msqdx surfaces. */
export function EqcChartTooltip({
  active,
  label,
  rows,
}: {
  active?: boolean
  label?: string
  rows: Array<{ name: string; value: string }>
}) {
  if (!active || rows.length === 0) return null
  return (
    <div className="plexon-eqc-chart-tooltip">
      {label ? <Text role="meta">{label}</Text> : null}
      {rows.map((row) => (
        <div key={row.name} className="plexon-eqc-chart-tooltip__row">
          <Text role="meta" as="span">
            {row.name}
          </Text>
          <Text role="title" as="span">
            {row.value}
          </Text>
        </div>
      ))}
    </div>
  )
}

export const EQC_CHART_TICK = {
  fontSize: 11,
  fill: 'var(--muted)',
  fontFamily: 'var(--font-body, inherit)',
} as const

export const EQC_CHART_TICK_INK = {
  fontSize: 11,
  fill: 'var(--ink, var(--fg))',
  fontFamily: 'var(--font-body, inherit)',
} as const

export const EQC_CHART_CURSOR = {
  fill: 'color-mix(in srgb, var(--ink) 5%, transparent)',
} as const
