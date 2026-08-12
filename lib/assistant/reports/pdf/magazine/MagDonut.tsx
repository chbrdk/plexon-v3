import React from 'react'
import { Path, Svg, Text, View } from '@react-pdf/renderer'
import { magColors, magStyles } from '@/lib/assistant/reports/pdf/magazine/tokens'

export type MagDonutSlice = {
  id: string
  label: string
  value: number
}

type MagDonutProps = {
  slices: MagDonutSlice[]
  centerValue?: string | number
  centerLabel?: string
  size?: number
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polar(cx, cy, r, endAngle)
  const end = polar(cx, cy, r, startAngle)
  const large = endAngle - startAngle > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`
}

export function MagDonut({
  slices,
  centerValue,
  centerLabel,
  size = 96,
}: MagDonutProps) {
  const positive = slices.filter((s) => s.value > 0)
  const total = positive.reduce((sum, s) => sum + s.value, 0) || 1
  const stroke = size * 0.18
  const r = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2

  let angle = 0
  const arcs = positive.map((slice, i) => {
    const sweep = (slice.value / total) * 360
    const start = angle
    const end = angle + Math.max(sweep, 0.4)
    angle = end
    return {
      id: slice.id,
      d: arcPath(cx, cy, r, start, end),
      color: magColors.donut[Math.min(i, magColors.donut.length - 1)],
      label: slice.label,
      value: slice.value,
      pct: Math.round((100 * slice.value) / total),
    }
  })

  return (
    <View style={{ width: '100%' }}>
      <View style={{ alignItems: 'center', marginBottom: 8, position: 'relative' }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {arcs.map((a) => (
            <Path
              key={a.id}
              d={a.d}
              stroke={a.color}
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="butt"
            />
          ))}
        </Svg>
        {(centerValue != null || centerLabel) && (
          <View
            style={{
              position: 'absolute',
              top: size / 2 - 14,
              width: size,
              alignItems: 'center',
            }}
          >
            {centerValue != null ? (
              <Text style={[magStyles.kpiValue, { fontSize: 12 }]}>{centerValue}</Text>
            ) : null}
            {centerLabel ? <Text style={magStyles.kpiLabel}>{centerLabel}</Text> : null}
          </View>
        )}
      </View>
      <View style={{ width: '100%' }}>
        {arcs.map((a) => (
          <View key={a.id} style={[magStyles.row, { marginBottom: 3, alignItems: 'center' }]}>
            <View
              style={{
                width: 8,
                height: 8,
                backgroundColor: a.color,
                marginRight: 6,
              }}
            />
            <View style={magStyles.rankedTextCol}>
              <Text style={[magStyles.rankedLabel, { fontSize: 7.5 }]}>{a.label}</Text>
            </View>
            <Text style={[magStyles.rankedMeta, { width: 40, textAlign: 'right' }]}>{a.pct}%</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
