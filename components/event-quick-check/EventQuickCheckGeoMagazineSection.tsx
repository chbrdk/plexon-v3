'use client'

import { Alert, RankedList, RankedRow, Text } from '@msqdx/ui'
import { EventQuickCheckCitationSection } from '@/components/event-quick-check/EventQuickCheckCitationSection'
import { EventQuickCheckScoreRing } from '@/components/event-quick-check/EventQuickCheckScoreRing'
import { EventQuickCheckVoiceRadar } from '@/components/event-quick-check/EventQuickCheckVoiceRadar'
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types'
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy'
import { buildEqcEeatReadingFallback } from '@/lib/assistant/reports/event-quick-check/build-eqc-eeat-reading'
import { buildEqcVoiceRadarPoints } from '@/lib/assistant/reports/event-quick-check/eqc-radar-geometry'
import { normalizeGeoDomain } from '@/lib/integrations/normalize-geo-domain'

type Props = {
  report: EventQuickCheckReportModel
  showQuestions?: boolean
}

function sharePct(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null
  return value <= 1 ? Math.round(value * 100) : Math.round(value)
}

function scoreTone(score: number | null | undefined): 'pos' | 'low' | 'neg' | undefined {
  if (score == null) return undefined
  if (score >= 70) return 'pos'
  if (score >= 45) return 'low'
  return 'neg'
}

/**
 * GEO magazine chapter — Checkion overview pattern:
 * score rings → share-of-voice race → model strip + ranking → E-E-A-T ledger → moves.
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
  const voiceRadarPoints = buildEqcVoiceRadarPoints(voiceRows)
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

      {(score != null || fitness != null || queryCount > 0) && (
        <section
          className="plexon-eqc-geo-snapshot"
          aria-label={EQC_REPORT_COPY.sectionGeoCheck}
        >
          <div className="plexon-eqc-geo-snapshot__dials">
            {score != null ? (
              <EventQuickCheckScoreRing
                value={score}
                label="GEO Score"
                meta="Zitierstärke"
                tone={scoreTone(score)}
                size="lg"
              />
            ) : null}
            {fitness != null ? (
              <EventQuickCheckScoreRing
                value={fitness}
                label="GEO Fitness"
                meta="On-page"
                tone={scoreTone(fitness)}
              />
            ) : null}
            {queryCount > 0 ? (
              <EventQuickCheckScoreRing
                value={queryCount}
                max={Math.max(queryCount, 12)}
                label="Prompts"
                meta="im Lauf"
              />
            ) : null}
          </div>
          <header className="plexon-eqc-geo-voice__head">
            <Text role="meta" as="p" className="plexon-eqc-geo-eyebrow">
              {EQC_REPORT_COPY.sectionGeoCheck}
            </Text>
            <p className="plexon-eqc-geo-snapshot__lede">
              {score != null
                ? `GEO Score ${score}/100 — so oft und wie stark Modelle deine Domain zitieren.`
                : fitness != null
                  ? `GEO Fitness ${fitness}/100 — On-Page-Tauglichkeit für generative Antworten.`
                  : `${queryCount} Prompts im Wettbewerbslauf.`}
            </p>
          </header>
        </section>
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
          <div className="plexon-eqc-geo-voice__board">
            <ol className="plexon-eqc-geo-voice__race" aria-label={EQC_REPORT_COPY.competitors}>
              {voiceRows.map((row, i) => {
                const width = Math.max(4, Math.round((100 * row.pct) / maxVoice))
                const subParts = [
                  row.mentionCount != null ? `${row.mentionCount} Mentions` : null,
                  row.avgPosition != null
                    ? `Ø #${Number(row.avgPosition).toFixed(1)}`
                    : null,
                ].filter(Boolean)
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
                      <div className="plexon-eqc-geo-voice__runner-copy">
                        <span className="plexon-eqc-geo-voice__runner-name">
                          {row.isOwn ? `${row.domain} · du` : row.domain}
                        </span>
                        {subParts.length > 0 ? (
                          <span className="plexon-eqc-geo-voice__runner-sub">
                            {subParts.join(' · ')}
                          </span>
                        ) : null}
                      </div>
                      <span className="plexon-eqc-geo-voice__runner-pct">{row.pct}%</span>
                    </div>
                    <div className="plexon-eqc-geo-voice__track" aria-hidden>
                      <span className="plexon-eqc-geo-voice__fill" />
                    </div>
                  </li>
                )
              })}
            </ol>
            {voiceRadarPoints ? (
              <EventQuickCheckVoiceRadar
                points={voiceRadarPoints}
                ariaLabel={`${EQC_REPORT_COPY.competitors} — Share of voice Spider`}
              />
            ) : null}
          </div>
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
            <Text role="display" as="h3" id="eqc-geo-eeat-heading">
              {EQC_REPORT_COPY.sectionGeoEeat}
            </Text>
            <div className="plexon-eqc-geo-eeat__reading">
              <Text role="meta" as="p" className="plexon-eqc-geo-eyebrow">
                {EQC_REPORT_COPY.geoEeatReadingLabel}
              </Text>
              <p className="plexon-eqc-geo-eeat__reading-body">
                {buildEqcEeatReadingFallback({
                  dimensions: eeatSorted,
                  missingElements: geo.eeatMissingElements,
                  geoFitnessReasoning: geo.geoFitnessReasoning,
                  weakest,
                  strongest,
                }) || EQC_REPORT_COPY.geoEeatWhyFallback}
              </p>
            </div>
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
                  {d.reasoning ? (
                    <p className="plexon-eqc-geo-score-ledger__why">{d.reasoning}</p>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="plexon-eqc-geo-eeat__side">
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
              {(geo.eeatMissingElements?.length ?? 0) > 0 ? (
                <div
                  className="plexon-eqc-geo-eeat-gaps"
                  aria-label={EQC_REPORT_COPY.geoEeatGapsLabel}
                >
                  <Text role="meta" as="p" className="plexon-eqc-geo-eyebrow">
                    {EQC_REPORT_COPY.geoEeatGapsLabel}
                  </Text>
                  <ul className="plexon-eqc-geo-eeat-gaps__list">
                    {geo.eeatMissingElements!.map((el) => (
                      <li key={el}>{el}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
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
