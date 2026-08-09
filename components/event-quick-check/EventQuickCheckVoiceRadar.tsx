'use client'

import { useId, useState } from 'react'
import { EqcChartTooltip } from '@/components/event-quick-check/EqcChartTooltip'
import {
  EQC_VOICE_RADAR_CX,
  EQC_VOICE_RADAR_CY,
  EQC_VOICE_RADAR_R,
  EQC_VOICE_RADAR_VIEW,
  eqcRadarGridRing,
  eqcRadarPolygon,
  eqcRadarVertex,
  type EqcRadarPoint,
} from '@/lib/assistant/reports/event-quick-check/eqc-radar-geometry'

type Props = {
  points: EqcRadarPoint[]
  ariaLabel: string
}

type HoverState = {
  point: EqcRadarPoint
  xPct: number
  yPct: number
}

/**
 * Share-of-voice spider (EchoN briefing radar pattern — SVG, no Recharts).
 */
export function EventQuickCheckVoiceRadar({ points, ariaLabel }: Props) {
  const tipId = useId()
  const [hover, setHover] = useState<HoverState | null>(null)

  if (points.length < 3) return null

  const poly = eqcRadarPolygon(points)
  const rings = [0.33, 0.66, 1].map((level) => eqcRadarGridRing(points.length, level))

  return (
    <div className="plexon-eqc-voice-radar" role="img" aria-label={ariaLabel}>
      <svg
        viewBox={`0 0 ${EQC_VOICE_RADAR_VIEW} ${EQC_VOICE_RADAR_VIEW}`}
        className="plexon-eqc-voice-radar__svg"
        aria-hidden
      >
        {rings.map((d, i) => (
          <polygon key={`ring-${i}`} className="plexon-eqc-voice-radar__ring" points={d} fill="none" />
        ))}
        {points.map((p, i) => {
          const tip = eqcRadarVertex(i, points.length, 1)
          return (
            <line
              key={`axis-${p.key}`}
              className="plexon-eqc-voice-radar__axis"
              x1={EQC_VOICE_RADAR_CX}
              y1={EQC_VOICE_RADAR_CY}
              x2={tip.x}
              y2={tip.y}
            />
          )
        })}
        <polygon className="plexon-eqc-voice-radar__shape" points={poly} />
        {points.map((p, i) => {
          const tip = eqcRadarVertex(i, points.length, clampDot(p.value))
          const active = hover?.point.key === p.key
          return (
            <g
              key={`dot-${p.key}`}
              className="plexon-eqc-voice-radar__hit"
              data-active={active ? 'true' : undefined}
              onMouseEnter={() =>
                setHover({
                  point: p,
                  xPct: (tip.x / EQC_VOICE_RADAR_VIEW) * 100,
                  yPct: (tip.y / EQC_VOICE_RADAR_VIEW) * 100,
                })
              }
              onMouseLeave={() => setHover(null)}
              onFocus={() =>
                setHover({
                  point: p,
                  xPct: (tip.x / EQC_VOICE_RADAR_VIEW) * 100,
                  yPct: (tip.y / EQC_VOICE_RADAR_VIEW) * 100,
                })
              }
              onBlur={() => setHover(null)}
            >
              <circle
                className="plexon-eqc-voice-radar__hit-area"
                cx={tip.x}
                cy={tip.y}
                r={14}
                tabIndex={0}
                role="button"
                aria-label={voiceTooltipAria(p)}
                aria-describedby={active ? tipId : undefined}
              />
              <circle
                className={
                  p.highlight
                    ? 'plexon-eqc-voice-radar__dot plexon-eqc-voice-radar__dot--own'
                    : 'plexon-eqc-voice-radar__dot'
                }
                cx={tip.x}
                cy={tip.y}
                r={p.highlight ? 4.5 : 3.5}
              />
            </g>
          )
        })}
        {points.map((p, i) => {
          const tip = eqcRadarVertex(
            i,
            points.length,
            1,
            EQC_VOICE_RADAR_CX,
            EQC_VOICE_RADAR_CY,
            EQC_VOICE_RADAR_R + 22,
          )
          return (
            <text
              key={`lbl-${p.key}`}
              className={
                p.highlight
                  ? 'plexon-eqc-voice-radar__label plexon-eqc-voice-radar__label--own'
                  : 'plexon-eqc-voice-radar__label'
              }
              x={tip.x}
              y={tip.y}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {p.label}
            </text>
          )
        })}
      </svg>

      {hover ? (
        <div
          id={tipId}
          className="plexon-eqc-voice-radar__tooltip"
          style={{
            left: `${hover.xPct}%`,
            top: `${hover.yPct}%`,
          }}
          role="tooltip"
        >
          <EqcChartTooltip
            active
            label={hover.point.domain ?? hover.point.label}
            rows={voiceTooltipRows(hover.point)}
          />
        </div>
      ) : null}

      <ul className="plexon-eqc-voice-radar__a11y">
        {points.map((p) => (
          <li key={p.key}>{voiceTooltipAria(p)}</li>
        ))}
      </ul>
    </div>
  )
}

function clampDot(v: number): number {
  return Math.max(0.04, Math.min(1, v))
}

function voiceTooltipRows(p: EqcRadarPoint): Array<{ name: string; value: string }> {
  const rows: Array<{ name: string; value: string }> = [
    { name: 'Share of voice', value: `${Math.round(p.value * 100)}%` },
  ]
  if (p.mentionCount != null) {
    rows.push({ name: 'Mentions', value: String(p.mentionCount) })
  }
  if (p.avgPosition != null && Number.isFinite(p.avgPosition)) {
    rows.push({ name: 'Ø Position', value: `#${Number(p.avgPosition).toFixed(1)}` })
  }
  if (p.highlight) {
    rows.push({ name: 'Rolle', value: 'eigene Domain' })
  }
  return rows
}

function voiceTooltipAria(p: EqcRadarPoint): string {
  const stats = voiceTooltipRows(p)
    .map((r) => `${r.name} ${r.value}`)
    .join(', ')
  return `${p.domain ?? p.label}: ${stats}`
}
