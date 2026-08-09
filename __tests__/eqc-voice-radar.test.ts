import { describe, expect, it } from 'vitest'
import {
  buildEqcVoiceRadarPoints,
  clamp01,
  eqcRadarPolygon,
  eqcRadarShortLabel,
  eqcRadarVertex,
  EQC_VOICE_RADAR_MAX_AXES,
} from '@/lib/assistant/reports/event-quick-check/eqc-radar-geometry'

describe('eqc-radar-geometry', () => {
  it('places first vertex at top when value=1', () => {
    const p = eqcRadarVertex(0, 6, 1, 100, 100, 50)
    expect(p.x).toBeCloseTo(100, 5)
    expect(p.y).toBeCloseTo(50, 5)
  })

  it('builds polygon for axes', () => {
    const poly = eqcRadarPolygon([
      { key: 'a', label: 'a', value: 1 },
      { key: 'b', label: 'b', value: 0.5 },
      { key: 'c', label: 'c', value: 0.25 },
    ])
    expect(poly.split(' ')).toHaveLength(3)
  })

  it('maps voice rows to radar points with caps', () => {
    const rows = Array.from({ length: 8 }, (_, i) => ({
      domain: `site-${i}.de`,
      pct: 80 - i * 8,
      isOwn: i === 0,
    }))
    const points = buildEqcVoiceRadarPoints(rows)
    expect(points).toHaveLength(EQC_VOICE_RADAR_MAX_AXES)
    expect(points![0]!.highlight).toBe(true)
    expect(points![0]!.value).toBe(clamp01(0.8))
    expect(buildEqcVoiceRadarPoints(rows.slice(0, 2))).toBeNull()
  })

  it('shortens long domain labels', () => {
    expect(eqcRadarShortLabel('muenchener-verein.de', true)).toContain('· du')
    expect(eqcRadarShortLabel('very-long-competitor-domain.example').endsWith('…')).toBe(true)
  })
})
