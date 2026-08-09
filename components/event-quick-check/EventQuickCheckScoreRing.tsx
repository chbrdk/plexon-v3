'use client'

type Tone = 'pos' | 'low' | 'neg'

type Props = {
  value: number
  max?: number
  label: string
  meta?: string
  tone?: Tone
  size?: 'lg' | 'md'
  'aria-label'?: string
}

function clampPct(value: number, max: number): number {
  if (!Number.isFinite(value) || max <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((100 * value) / max)))
}

/**
 * Magazine score dial — thin conic ring with display numeral (CHECKION donut family).
 */
export function EventQuickCheckScoreRing({
  value,
  max = 100,
  label,
  meta,
  tone,
  size = 'md',
  'aria-label': ariaLabel,
}: Props) {
  const pct = clampPct(value, max)
  const display =
    max === 100 && Number.isInteger(value)
      ? String(value)
      : Number.isInteger(value)
        ? String(value)
        : value.toFixed(1)

  return (
    <figure
      className="plexon-eqc-score-ring"
      data-size={size}
      data-tone={tone}
      role="img"
      aria-label={ariaLabel ?? `${label}: ${display}${max === 100 ? '/100' : ''}`}
    >
      <div
        className="plexon-eqc-score-ring__chart"
        style={{
          background: `conic-gradient(from -90deg, var(--ring-fill) 0% ${pct}%, var(--ring-track) ${pct}% 100%)`,
        }}
        aria-hidden
      >
        <div className="plexon-eqc-score-ring__hole">
          <span className="plexon-eqc-score-ring__v">{display}</span>
          {max === 100 ? <span className="plexon-eqc-score-ring__unit">/100</span> : null}
        </div>
      </div>
      <figcaption className="plexon-eqc-score-ring__cap">
        <span className="plexon-eqc-score-ring__k">{label}</span>
        {meta ? <span className="plexon-eqc-score-ring__m">{meta}</span> : null}
      </figcaption>
    </figure>
  )
}
