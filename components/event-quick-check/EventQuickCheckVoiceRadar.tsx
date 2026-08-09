'use client'

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

/**
 * Share-of-voice spider (EchoN briefing radar pattern — SVG, no Recharts).
 */
export function EventQuickCheckVoiceRadar({ points, ariaLabel }: Props) {
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
          return (
            <circle
              key={`dot-${p.key}`}
              className={
                p.highlight
                  ? 'plexon-eqc-voice-radar__dot plexon-eqc-voice-radar__dot--own'
                  : 'plexon-eqc-voice-radar__dot'
              }
              cx={tip.x}
              cy={tip.y}
              r={p.highlight ? 3.5 : 2.5}
            />
          )
        })}
        {points.map((p, i) => {
          const tip = eqcRadarVertex(i, points.length, 1, EQC_VOICE_RADAR_CX, EQC_VOICE_RADAR_CY, EQC_VOICE_RADAR_R + 20)
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
      <ul className="plexon-eqc-voice-radar__a11y">
        {points.map((p) => (
          <li key={p.key}>
            {p.label}: {Math.round(p.value * 100)}%
          </li>
        ))}
      </ul>
    </div>
  )
}

function clampDot(v: number): number {
  return Math.max(0.04, Math.min(1, v))
}
