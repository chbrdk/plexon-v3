'use client'

import { useCallback, useId, useState } from 'react'
import type { EventQuickCheckReportRecommendation } from '@/lib/assistant/reports/event-quick-check-report-types'

type MagTone = 'pos' | 'low' | 'neg'

function priorityTone(priority?: number): MagTone {
  if (priority == null) return 'low'
  if (priority <= 1) return 'neg'
  if (priority === 2) return 'low'
  return 'pos'
}

function priorityLabel(priority?: number): string {
  if (priority == null) return 'move'
  if (priority <= 1) return 'high'
  if (priority === 2) return 'medium'
  return 'low'
}

type Props = {
  recommendations: EventQuickCheckReportRecommendation[]
  /** Accessible name for the carousel region */
  label?: string
}

/**
 * Checkion-style recommendation slideshow (Next moves).
 */
export function EventQuickCheckMovesGallery({
  recommendations,
  label = 'Empfehlungen',
}: Props) {
  const labelId = useId()
  const total = recommendations.length
  const [index, setIndex] = useState(0)
  const safeIndex = total === 0 ? 0 : Math.min(index, total - 1)
  const rec = recommendations[safeIndex]

  const go = useCallback(
    (dir: -1 | 1) => {
      if (total <= 1) return
      setIndex((i) => (i + dir + total) % total)
    },
    [total],
  )

  if (!rec || total === 0) return null

  const tone = priorityTone(rec.priority)

  return (
    <div
      className="plexon-eqc-moves__gallery"
      role="region"
      aria-roledescription="carousel"
      aria-labelledby={labelId}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          go(-1)
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          go(1)
        }
      }}
    >
      <div className="plexon-eqc-moves__toolbar">
        <p id={labelId} className="plexon-eqc-moves__count">
          <span className="plexon-eqc-moves__count-cur">
            {String(safeIndex + 1).padStart(2, '0')}
          </span>
          <span aria-hidden> / </span>
          <span>{String(total).padStart(2, '0')}</span>
          <span className="plexon-eqc-moves__count-label">{label}</span>
        </p>
        {total > 1 ? (
          <div className="plexon-eqc-moves__controls">
            <button
              type="button"
              className="plexon-eqc-moves__ctrl"
              onClick={() => go(-1)}
              aria-label="Vorherige Empfehlung"
            >
              ←
            </button>
            <button
              type="button"
              className="plexon-eqc-moves__ctrl"
              onClick={() => go(1)}
              aria-label="Nächste Empfehlung"
            >
              →
            </button>
          </div>
        ) : null}
      </div>

      <article
        key={`${rec.title}-${safeIndex}`}
        className="plexon-eqc-moves__slide"
        data-tone={tone}
        aria-label={`Empfehlung ${safeIndex + 1} von ${total}`}
      >
        <div className="plexon-eqc-moves__slide-head">
          <span className="plexon-eqc-moves__idx" aria-hidden>
            {String(safeIndex + 1).padStart(2, '0')}
          </span>
          <div className="plexon-eqc-moves__meta">
            <span className="plexon-eqc-moves__sev">{priorityLabel(rec.priority)}</span>
            {rec.category ? (
              <span className="plexon-eqc-moves__src">{rec.category}</span>
            ) : null}
          </div>
        </div>
        <p className="plexon-eqc-moves__lead">
          <span className="plexon-eqc-moves__title">{rec.title}</span>
        </p>
        {rec.description ? <p className="plexon-eqc-moves__copy">{rec.description}</p> : null}
      </article>

      {total > 1 ? (
        <ol className="plexon-eqc-moves__ticks" aria-hidden>
          {recommendations.map((r, i) => (
            <li key={`${r.title}-${i}`}>
              <button
                type="button"
                className="plexon-eqc-moves__tick"
                data-active={i === safeIndex ? 'true' : undefined}
                onClick={() => setIndex(i)}
                tabIndex={-1}
                aria-label={`Zur Empfehlung ${i + 1}`}
              />
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  )
}
