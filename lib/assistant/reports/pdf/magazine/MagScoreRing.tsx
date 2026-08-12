import React from 'react'
import { Circle, Svg, Text, View } from '@react-pdf/renderer'
import { magColors, magStyles } from '@/lib/assistant/reports/pdf/magazine/tokens'

type MagScoreRingProps = {
  value: number
  max?: number
  label?: string
  size?: number
  stroke?: number
}

/** Arc ring via stroke-dasharray on a circle (react-pdf Svg). */
export function MagScoreRing({
  value,
  max = 100,
  label,
  size = 80,
  stroke = 7,
}: MagScoreRingProps) {
  const clamped = Math.max(0, Math.min(max, Number.isFinite(value) ? value : 0))
  const pct = max > 0 ? clamped / max : 0
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = Math.max(0.01, pct * c)
  const gap = Math.max(0.01, c - dash)
  const display = Number.isInteger(clamped) ? String(Math.round(clamped)) : clamped.toFixed(1)

  return (
    <View style={{ alignItems: 'center', width: size + 8, position: 'relative' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={magColors.track}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={magColors.accent}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${gap}`}
          strokeLinecap="butt"
          // Start at 12 o'clock
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View
        style={{
          position: 'absolute',
          top: size / 2 - 12,
          width: size,
          alignItems: 'center',
        }}
      >
        <Text style={[magStyles.kpiValue, { fontSize: size > 70 ? 16 : 12 }]}>{display}</Text>
      </View>
      {label ? <Text style={[magStyles.kpiLabel, { marginTop: 6, textAlign: 'center' }]}>{label}</Text> : null}
    </View>
  )
}
