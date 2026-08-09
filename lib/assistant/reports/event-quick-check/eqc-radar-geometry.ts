/**
 * Polar geometry for EQC magazine spider charts (EchoN ScoreRadar pattern).
 * Spec/knowledge: knowledge/eqc-geo-voice-radar.md
 */

export type EqcRadarPoint = {
  key: string
  label: string
  /** 0..1 */
  value: number
  highlight?: boolean
}

export const EQC_VOICE_RADAR_MIN_AXES = 3
export const EQC_VOICE_RADAR_MAX_AXES = 6
export const EQC_VOICE_RADAR_VIEW = 240
export const EQC_VOICE_RADAR_CX = 120
export const EQC_VOICE_RADAR_CY = 120
export const EQC_VOICE_RADAR_R = 72

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

/** Polar point; angle 0 at top, clockwise. */
export function eqcRadarVertex(
  index: number,
  total: number,
  value: number,
  cx = EQC_VOICE_RADAR_CX,
  cy = EQC_VOICE_RADAR_CY,
  radius = EQC_VOICE_RADAR_R,
): { x: number; y: number } {
  const v = clamp01(value)
  const angle = -Math.PI / 2 + (index / Math.max(total, 1)) * Math.PI * 2
  return {
    x: cx + Math.cos(angle) * radius * v,
    y: cy + Math.sin(angle) * radius * v,
  }
}

export function eqcRadarPolygon(
  points: EqcRadarPoint[],
  cx = EQC_VOICE_RADAR_CX,
  cy = EQC_VOICE_RADAR_CY,
  radius = EQC_VOICE_RADAR_R,
): string {
  if (!points.length) return ''
  return points
    .map((p, i) => {
      const { x, y } = eqcRadarVertex(i, points.length, p.value, cx, cy, radius)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

export function eqcRadarGridRing(
  axes: number,
  level: number,
  cx = EQC_VOICE_RADAR_CX,
  cy = EQC_VOICE_RADAR_CY,
  radius = EQC_VOICE_RADAR_R,
): string {
  const dummy: EqcRadarPoint[] = Array.from({ length: axes }, (_, i) => ({
    key: String(i),
    label: '',
    value: level,
  }))
  return eqcRadarPolygon(dummy, cx, cy, radius)
}

/** Short axis label for spider (domains can be long). */
export function eqcRadarShortLabel(domain: string, isOwn?: boolean): string {
  const base = domain.replace(/^www\./i, '').trim()
  const short = base.length > 14 ? `${base.slice(0, 12)}…` : base
  return isOwn ? `${short} · du` : short
}

export type VoiceRadarRow = {
  domain: string
  pct: number
  isOwn?: boolean
}

/** Top-N share-of-voice → radar axes (pct 0..100 → 0..1). */
export function buildEqcVoiceRadarPoints(
  rows: VoiceRadarRow[],
  opts?: { maxAxes?: number; minAxes?: number },
): EqcRadarPoint[] | null {
  const maxAxes = opts?.maxAxes ?? EQC_VOICE_RADAR_MAX_AXES
  const minAxes = opts?.minAxes ?? EQC_VOICE_RADAR_MIN_AXES
  const sliced = rows.slice(0, maxAxes).filter((r) => r.domain)
  if (sliced.length < minAxes) return null
  return sliced.map((r) => ({
    key: r.domain,
    label: eqcRadarShortLabel(r.domain, r.isOwn),
    value: clamp01(r.pct / 100),
    highlight: Boolean(r.isOwn),
  }))
}
