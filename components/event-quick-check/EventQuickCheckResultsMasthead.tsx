'use client'

import type { ReactNode } from 'react'
import { Chip, Text } from '@msqdx/ui'
import type {
  EventQuickCheckReportKpiTile,
  EventQuickCheckReportModel,
} from '@/lib/assistant/reports/event-quick-check-report-types'
import { EQC_PAGE_COPY } from '@/lib/assistant/event-quick-check/event-quick-check-page-copy'

const DECK_MAX = 220
const METRIC_MAX = 4

type Props = {
  report: EventQuickCheckReportModel
  kpiTiles: EventQuickCheckReportKpiTile[]
  generatedAt?: string | null
  readOnly?: boolean
  platformProjectId?: string
  personaCount?: number
  actions?: ReactNode
}

function scoreTone(score: number | null | undefined): 'pos' | 'low' | 'neg' | undefined {
  if (score == null || !Number.isFinite(score)) return undefined
  if (score >= 70) return 'pos'
  if (score >= 45) return 'low'
  return 'neg'
}

function isDomainScoreTile(tile: EventQuickCheckReportKpiTile): boolean {
  return /domain/i.test(tile.label)
}

function resolveHero(
  report: EventQuickCheckReportModel,
  kpiTiles: EventQuickCheckReportKpiTile[],
): { value: number | null; label: string; tileIndex: number } {
  const domainScore = report.domain?.score
  if (typeof domainScore === 'number' && Number.isFinite(domainScore)) {
    const idx = kpiTiles.findIndex(isDomainScoreTile)
    return { value: Math.round(domainScore), label: 'Domain', tileIndex: idx }
  }

  const domainTileIdx = kpiTiles.findIndex(isDomainScoreTile)
  if (domainTileIdx >= 0) {
    const tile = kpiTiles[domainTileIdx]!
    const n = typeof tile.value === 'number' ? tile.value : Number(tile.value)
    if (Number.isFinite(n)) {
      return { value: Math.round(n), label: 'Domain', tileIndex: domainTileIdx }
    }
  }

  const geo = report.geo?.overallScore
  if (typeof geo === 'number' && Number.isFinite(geo)) {
    const idx = kpiTiles.findIndex((t) => /geo-score/i.test(t.label))
    return { value: Math.round(geo), label: 'GEO', tileIndex: idx }
  }

  const firstNumeric = kpiTiles.findIndex(
    (t) => typeof t.value === 'number' || Number.isFinite(Number(t.value)),
  )
  if (firstNumeric >= 0) {
    const tile = kpiTiles[firstNumeric]!
    const n = typeof tile.value === 'number' ? tile.value : Number(tile.value)
    return {
      value: Number.isFinite(n) ? Math.round(n) : null,
      label: tile.label.replace(/-score$/i, '').trim() || 'Score',
      tileIndex: firstNumeric,
    }
  }

  return { value: null, label: 'Domain', tileIndex: -1 }
}

function shortenDeck(text: string | undefined): string | null {
  if (!text?.trim()) return null
  const one = text.trim().replace(/\s+/g, ' ')
  if (one.length <= DECK_MAX) return one
  return `${one.slice(0, DECK_MAX - 1).trim()}…`
}

function formatMetricValue(tile: EventQuickCheckReportKpiTile): string {
  const base = String(tile.value ?? '—')
  return tile.unit ? `${base}${tile.unit.startsWith('/') ? tile.unit : ` ${tile.unit}`}` : base
}

/**
 * Checkion-style magazine masthead for EQC results (score + metrics + host/title).
 */
export function EventQuickCheckResultsMasthead({
  report,
  kpiTiles,
  generatedAt,
  readOnly = false,
  platformProjectId,
  personaCount,
  actions,
}: Props) {
  const hero = resolveHero(report, kpiTiles)
  const metrics = kpiTiles
    .filter((_, i) => i !== hero.tileIndex)
    .slice(0, METRIC_MAX)
  const host = report.meta.domain || report.meta.url || '—'
  const title = report.meta.title || EQC_PAGE_COPY.pageTitle
  const deck = shortenDeck(report.executive.summary || report.executive.fazit)
  const tone = scoreTone(hero.value)

  const hint = [
    generatedAt,
    readOnly ? EQC_PAGE_COPY.sharePublicReadOnly : null,
    !readOnly && platformProjectId ? EQC_PAGE_COPY.shareTeamHint : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const tags: string[] = []
  if (report.meta.playbookLabel) tags.push(report.meta.playbookLabel)
  if (personaCount && personaCount > 0) {
    tags.push(`${personaCount} Persona${personaCount === 1 ? '' : 's'}`)
  }

  return (
    <div
      className="plexon-eqc-masthead-shell"
      data-section="eqc-results-masthead"
      data-eqc-chapter="short"
    >
      <div className="plexon-eqc-masthead-topbar">
        <p className="plexon-eqc-masthead-topbar__hint">{hint || EQC_PAGE_COPY.pageTitle}</p>
        {actions ? <div className="plexon-eqc-results-actions">{actions}</div> : null}
      </div>

      <header className="plexon-eqc-masthead" data-tone={tone}>
        <div className="plexon-eqc-masthead__hero">
          <div className="plexon-eqc-cover__score-col">
            <div
              className="plexon-eqc-cover__score"
              aria-label={`${hero.label} ${hero.value ?? '—'}`}
            >
              <span className="plexon-eqc-cover__score-num">{hero.value ?? '—'}</span>
              <span className="plexon-eqc-cover__score-label">{hero.label}</span>
            </div>
            {metrics.length > 0 ? (
              <dl className="plexon-eqc-cover__metrics" aria-label="Kennzahlen">
                {metrics.map((tile) => (
                  <div key={tile.label}>
                    <dt>{tile.label}</dt>
                    <dd>{formatMetricValue(tile)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>

          <div className="plexon-eqc-cover__copy">
            <p className="plexon-eqc-cover__host">{host}</p>
            <Text role="headline" as="h2" className="plexon-eqc-cover__title">
              {title}
            </Text>
            {deck ? <p className="plexon-eqc-cover__deck">{deck}</p> : null}
            {tags.length > 0 ? (
              <div className="plexon-eqc-cover__tags">
                {tags.map((tag) => (
                  <Chip key={tag} static size="sm">
                    {tag}
                  </Chip>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </header>
    </div>
  )
}
