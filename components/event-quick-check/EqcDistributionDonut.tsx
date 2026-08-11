import type { ReactNode } from 'react'

export type EqcDistributionSlice = {
  id: string
  label: string
  value: number
}

function buildConic(slices: EqcDistributionSlice[], total: number): string {
  let acc = 0
  const stops: string[] = []
  slices.forEach((slice, i) => {
    if (slice.value <= 0) return
    const start = (acc / total) * 100
    acc += slice.value
    const end = (acc / total) * 100
    stops.push(`var(--donut-${Math.min(i + 1, 8)}) ${start}% ${end}%`)
  })
  if (stops.length === 0) {
    return 'var(--line, #333) 0% 100%'
  }
  return stops.join(', ')
}

/** Soft multi-slice donut for corpus share — Checkion DistributionDonut parity. */
export function EqcDistributionDonut({
  slices,
  centerValue,
  centerLabel,
  'aria-label': ariaLabel,
}: {
  slices: EqcDistributionSlice[]
  centerValue?: ReactNode
  centerLabel?: ReactNode
  'aria-label'?: string
}) {
  const positive = slices.filter((s) => s.value > 0)
  const total = positive.reduce((sum, s) => sum + s.value, 0) || 1
  const gradient = buildConic(positive, total)

  return (
    <div className="plexon-eqc-donut" role="img" aria-label={ariaLabel}>
      <div
        className="plexon-eqc-donut__chart"
        style={{ background: `conic-gradient(from -90deg, ${gradient})` }}
        aria-hidden
      >
        <div className="plexon-eqc-donut__hole">
          {centerValue != null ? (
            <span className="plexon-eqc-donut__center-v">{centerValue}</span>
          ) : null}
          {centerLabel != null ? (
            <span className="plexon-eqc-donut__center-k">{centerLabel}</span>
          ) : null}
        </div>
      </div>
      <ul className="plexon-eqc-donut__legend">
        {positive.map((slice, i) => {
          const pct = Math.round((100 * slice.value) / total)
          return (
            <li key={slice.id} data-i={Math.min(i + 1, 8)}>
              <span className="plexon-eqc-donut__swatch" aria-hidden />
              <span className="plexon-eqc-donut__name">{slice.label}</span>
              <span className="plexon-eqc-donut__n">{slice.value.toLocaleString()}</span>
              <span className="plexon-eqc-donut__pct">{pct}%</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
