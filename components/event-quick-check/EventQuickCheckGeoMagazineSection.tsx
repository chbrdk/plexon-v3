'use client'

import { Alert, RankedList, RankedRow, StatusMeterPanel, Text } from '@msqdx/ui'
import { EventQuickCheckCitationSection } from '@/components/event-quick-check/EventQuickCheckCitationSection'
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types'
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy'
import { normalizeGeoDomain } from '@/lib/integrations/normalize-geo-domain'

type Props = {
  report: EventQuickCheckReportModel
  showQuestions?: boolean
}

function sharePct(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null
  return value <= 1 ? Math.round(value * 100) : Math.round(value)
}

function meterLevel(score: number | null | undefined): 'ok' | 'warn' | 'critical' {
  if (score == null) return 'warn'
  if (score >= 70) return 'ok'
  if (score >= 45) return 'warn'
  return 'critical'
}

/**
 * GEO magazine chapter — Checkion overview pattern:
 * snapshot meters → share-of-voice race → model strip + ranking → E-E-A-T ledger → moves.
 */
export function EventQuickCheckGeoMagazineSection({ report, showQuestions = false }: Props) {
  const geo = report.geo
  const ownHost = normalizeGeoDomain(geo.url ?? report.meta.domain ?? report.meta.url)

  const voiceRows = (() => {
    const rows = geo.competitors
      .map((c) => {
        const pct = sharePct(c.shareOfVoice ?? c.score ?? null)
        return {
          domain: c.name,
          pct: pct ?? 0,
          avgPosition: c.avgPosition,
          mentionCount: c.mentionCount,
          isOwn: normalizeGeoDomain(c.name) === ownHost,
        }
      })
      .filter((r) => r.domain)
    if (ownHost && !rows.some((r) => r.isOwn) && geo.overallScore != null) {
      rows.unshift({
        domain: ownHost,
        pct: Math.round(geo.overallScore),
        avgPosition: null,
        mentionCount: null,
        isOwn: true,
      })
    }
    return rows.sort((a, b) => b.pct - a.pct)
  })()

  const maxVoice = Math.max(...voiceRows.map((r) => r.pct), 1)
  const eeatSorted = [...geo.eeatDimensions].sort((a, b) => a.score - b.score)
  const weakest = eeatSorted[0]
  const strongest = eeatSorted[eeatSorted.length - 1]
  const eeatSpan =
    weakest && strongest ? Math.max(0, strongest.score - weakest.score) : null

  const score = geo.overallScore
  const fitness = geo.geoFitnessScore
  const queryCount = geo.questions.length || geo.citationHighlights.length || 0

  return (
    <div className="plexon-eqc-geo-spread" data-section="eqc-geo-spread">
      {geo.status === 'failed' && geo.errorMessage ? (
        <Alert tone="error">{geo.errorMessage}</Alert>
      ) : null}

      {(score != null || fitness != null) && (
        <StatusMeterPanel
          title={EQC_REPORT_COPY.sectionGeoCheck}
          meta={ownHost || undefined}
          level={meterLevel(score ?? fitness)}
          banner={
            score != null
              ? `GEO Score ${score}/100 — so oft und wie stark Modelle deine Domain zitieren.`
              : `GEO Fitness ${fitness}/100`
          }
          meters={[
            ...(score != null
              ? [
                  {
                    id: 'geo-score',
                    label: 'GEO Score',
                    value: String(score),
                    fillPct: Math.max(0, Math.min(100, score)),
                  },
                ]
              : []),
            ...(fitness != null
              ? [
                  {
                    id: 'geo-fitness',
                    label: 'GEO Fitness',
                    value: String(fitness),
                    fillPct: Math.max(0, Math.min(100, fitness)),
                  },
                ]
              : []),
            {
              id: 'queries',
              label: 'Prompts',
              value: String(queryCount || '—'),
              fillPct: queryCount ? Math.min(100, queryCount * 12) : 0,
            },
          ]}
        />
      )}

      {voiceRows.length > 0 ? (
        <section className="plexon-eqc-geo-voice" aria-labelledby="eqc-geo-voice-heading">
          <header className="plexon-eqc-geo-voice__head">
            <Text role="meta" as="p" className="plexon-eqc-geo-eyebrow">
              Share of voice
            </Text>
            <Text role="display" as="h3" id="eqc-geo-voice-heading">
              {EQC_REPORT_COPY.competitors}
            </Text>
          </header>
          <ol className="plexon-eqc-geo-voice__race" aria-label={EQC_REPORT_COPY.competitors}>
            {voiceRows.map((row, i) => {
              const width = Math.max(4, Math.round((100 * row.pct) / maxVoice))
              return (
                <li
                  key={row.domain}
                  className="plexon-eqc-geo-voice__runner"
                  data-target={row.isOwn ? 'true' : undefined}
                  style={{ ['--voice-w' as string]: `${width}%` }}
                >
                  <div className="plexon-eqc-geo-voice__runner-meta">
                    <span className="plexon-eqc-geo-voice__runner-idx" aria-hidden>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="plexon-eqc-geo-voice__runner-name">
                      {row.isOwn ? `${row.domain} · du` : row.domain}
                    </span>
                    <span className="plexon-eqc-geo-voice__runner-pct">{row.pct}%</span>
                  </div>
                  <div className="plexon-eqc-geo-voice__track" aria-hidden>
                    <span className="plexon-eqc-geo-voice__fill" />
                  </div>
                  {(row.mentionCount != null || row.avgPosition != null) && (
                    <p className="plexon-eqc-geo-voice__runner-sub">
                      {row.mentionCount != null ? `${row.mentionCount} Mentions` : null}
                      {row.mentionCount != null && row.avgPosition != null ? ' · ' : null}
                      {row.avgPosition != null
                        ? `Ø Position #${Number(row.avgPosition).toFixed(1)}`
                        : null}
                    </p>
                  )}
                </li>
              )
            })}
          </ol>
        </section>
      ) : null}

      <EventQuickCheckCitationSection
        citationHighlights={geo.citationHighlights}
        citationHighlightsByModel={geo.citationHighlightsByModel}
        ownDomain={geo.url ?? report.meta.domain ?? report.meta.url}
        knownCompetitors={geo.competitors.map((c) => c.name)}
      />

      {eeatSorted.length > 0 ? (
        <section className="plexon-eqc-geo-eeat" aria-labelledby="eqc-geo-eeat-heading">
          <header className="plexon-eqc-geo-voice__head">
            <Text role="meta" as="p" className="plexon-eqc-geo-eyebrow">
              On-page
            </Text>
            <Text role="title" as="h3" id="eqc-geo-eeat-heading">
              {EQC_REPORT_COPY.sectionGeoEeat}
            </Text>
          </header>
          <div className="plexon-eqc-geo-eeat__layout">
            <div className="plexon-eqc-geo-score-ledger" aria-label={EQC_REPORT_COPY.sectionGeoEeat}>
              {eeatSorted.map((d, index) => (
                <div
                  key={d.key}
                  className="plexon-eqc-geo-score-ledger__cell"
                  style={{ ['--bar' as string]: `${Math.max(0, Math.min(100, d.score))}%` }}
                >
                  <span className="plexon-eqc-geo-score-ledger__idx">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="plexon-eqc-geo-score-ledger__label">{d.label}</span>
                  <span className="plexon-eqc-geo-score-ledger__value">{d.score}</span>
                  <span className="plexon-eqc-geo-score-ledger__bar" aria-hidden />
                </div>
              ))}
            </div>
            {eeatSpan != null && weakest && strongest ? (
              <aside className="plexon-eqc-geo-callout">
                <Text role="meta" as="p" className="plexon-eqc-geo-eyebrow">
                  Spanne
                </Text>
                <p className="plexon-eqc-geo-callout__num">{eeatSpan}</p>
                <Text role="hint" as="p">
                  Punkte zwischen {weakest.label} ({weakest.score}) und {strongest.label} (
                  {strongest.score}).
                </Text>
              </aside>
            ) : null}
          </div>
        </section>
      ) : null}

      {geo.recommendations.length > 0 ? (
        <RankedList hint={EQC_REPORT_COPY.sectionGeoRecommendations}>
          {geo.recommendations.map((r, i) => (
            <RankedRow key={i} index={i + 1} label={r.title} secondary={r.description} />
          ))}
        </RankedList>
      ) : null}

      {showQuestions && geo.questions.length > 0 ? (
        <RankedList hint={EQC_REPORT_COPY.sectionGeoQuestions}>
          {geo.questions.map((q, i) => (
            <RankedRow key={i} index={i + 1} label={q} />
          ))}
        </RankedList>
      ) : null}
    </div>
  )
}
