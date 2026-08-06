'use client'

import { Button, RankedList, RankedRow, Text } from '@msqdx/ui'
import type { EventQuickCheckReportDomainSection } from '@/lib/assistant/reports/event-quick-check-report-types'
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy'

type Props = {
  domain: EventQuickCheckReportDomainSection
}

function tileTone(score: number): 'pos' | 'low' | 'neg' {
  if (score >= 80) return 'pos'
  if (score >= 50) return 'low'
  return 'neg'
}

/**
 * Domain & a11y chapter — Checkion lab-tile metrics left, top issues right.
 */
export function EventQuickCheckDomainMagazineSection({ domain }: Props) {
  const tiles = [
    {
      key: 'score',
      value: String(domain.score),
      unit: '/100',
      label: 'Score',
      meta: domain.domain || 'Domain-Scan',
      tone: tileTone(domain.score),
    },
    {
      key: 'pages',
      value: String(domain.totalPages),
      label: 'Seiten',
      meta: 'gescannt',
      tone: undefined as 'pos' | 'low' | 'neg' | undefined,
    },
    {
      key: 'errors',
      value: String(domain.stats.errors),
      label: 'Fehler',
      meta: 'A11y critical / serious',
      tone: domain.stats.errors > 0 ? ('neg' as const) : ('pos' as const),
    },
    {
      key: 'warnings',
      value: String(domain.stats.warnings),
      label: 'Warnungen',
      meta: domain.stats.notices ? `${domain.stats.notices} Notices` : 'moderate / minor',
      tone: domain.stats.warnings > 0 ? ('low' as const) : ('pos' as const),
    },
  ]

  return (
    <div className="plexon-eqc-domain-spread" data-section="eqc-domain-spread">
      <div className="plexon-eqc-domain-spread__body">
        <section className="plexon-eqc-domain-spread__metrics" aria-label={EQC_REPORT_COPY.sectionDomain}>
          <Text role="meta" as="p" className="plexon-eqc-geo-eyebrow">
            Field notes
          </Text>
          <div
            className="plexon-eqc-lab plexon-eqc-lab--notes"
            style={{ ['--notes-cols' as string]: '2' }}
          >
            {tiles.map((tile) => (
              <div
                key={tile.key}
                className="plexon-eqc-lab-tile"
                data-tone={tile.tone}
              >
                <strong className="plexon-eqc-lab-tile__v">
                  {tile.value}
                  {tile.unit ? (
                    <span className="plexon-eqc-lab-tile__unit">{tile.unit}</span>
                  ) : null}
                </strong>
                <span className="plexon-eqc-lab-tile__k">{tile.label}</span>
                <span className="plexon-eqc-lab-tile__m">{tile.meta}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="plexon-eqc-domain-spread__issues" aria-label={EQC_REPORT_COPY.sectionTopIssues}>
          <Text role="meta" as="p" className="plexon-eqc-geo-eyebrow">
            {EQC_REPORT_COPY.sectionTopIssues}
          </Text>
          {domain.topIssues.length > 0 ? (
            <RankedList>
              {domain.topIssues.map((issue, i) => (
                <RankedRow
                  key={issue.title}
                  index={i + 1}
                  label={issue.title}
                  value={String(issue.count)}
                />
              ))}
            </RankedList>
          ) : (
            <Text role="hint">Keine Top-Probleme gemeldet.</Text>
          )}
          {domain.checkionHref ? (
            <Button
              variant="link"
              size="sm"
              href={domain.checkionHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              In CHECKION öffnen
            </Button>
          ) : null}
        </section>
      </div>
    </div>
  )
}
