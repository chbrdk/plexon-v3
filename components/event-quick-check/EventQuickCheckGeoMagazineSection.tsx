'use client'

import { Alert, RankedList, RankedRow, Text } from '@msqdx/ui'
import { EventQuickCheckCitationSection } from '@/components/event-quick-check/EventQuickCheckCitationSection'
import { EventQuickCheckScoreRing } from '@/components/event-quick-check/EventQuickCheckScoreRing'
import { EventQuickCheckVoiceRadar } from '@/components/event-quick-check/EventQuickCheckVoiceRadar'
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types'
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy'
import type { EqcGeoSnapshot } from '@/lib/assistant/reports/event-quick-check/build-eqc-geo-snapshot'
import { buildEqcVoiceRadarPoints } from '@/lib/assistant/reports/event-quick-check/eqc-radar-geometry'
import { normalizeGeoDomain } from '@/lib/integrations/normalize-geo-domain'

type Props = {
  report: EventQuickCheckReportModel
  geo?: EventQuickCheckReportModel['geo']
  /** Fixed dials across layers — must not follow the active layer switch. */
  snapshot?: EqcGeoSnapshot
  layerLabel?: string
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
 * fixed snapshot dials → share-of-voice race → model strip + ranking.
 * E-E-A-T and GEO recommendations live in their own bands.
 */
export function EventQuickCheckGeoMagazineSection({
  report,
  geo: geoOverride,
  snapshot: snapshotOverride,
  layerLabel,
  showQuestions = true,
}: Props) {
  const geo = geoOverride ?? report.geo
  const snapshot: EqcGeoSnapshot = snapshotOverride ?? {
    citedShare: sharePct(geo.citedShare),
    geoFitnessScore:
      typeof geo.geoFitnessScore === 'number' && Number.isFinite(geo.geoFitnessScore)
        ? Math.round(geo.geoFitnessScore)
        : null,
    promptCount: geo.questions.length || geo.citationHighlights.length || 0,
  }
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
    if (ownHost && !rows.some((r) => r.isOwn)) {
      const ownPct = sharePct(geo.citedShare)
      if (ownPct != null) {
        rows.unshift({
          domain: ownHost,
          pct: ownPct,
          avgPosition: null,
          mentionCount: null,
          isOwn: true,
        })
      }
    }
    return rows.sort((a, b) => b.pct - a.pct)
  })()

  const maxVoice = Math.max(...voiceRows.map((r) => r.pct), 1)
  const voiceRadarPoints = buildEqcVoiceRadarPoints(voiceRows)

  const citedShare = snapshot.citedShare
  const fitness = snapshot.geoFitnessScore
  const queryCount = snapshot.promptCount

  const lede =
    citedShare != null
      ? EQC_REPORT_COPY.geoSnapshotLedeCited(citedShare)
      : fitness != null
        ? EQC_REPORT_COPY.geoSnapshotLedeFitness(fitness)
        : queryCount > 0
          ? EQC_REPORT_COPY.geoSnapshotLedePrompts(queryCount)
          : null

  return (
    <div className="plexon-eqc-geo-spread" data-section="eqc-geo-spread">
      {layerLabel ? (
        <Text role="label" as="h3">
          {layerLabel}
        </Text>
      ) : null}
      {geo.status === 'failed' && geo.errorMessage ? (
        <Alert tone="error">{geo.errorMessage}</Alert>
      ) : null}

      {(citedShare != null || fitness != null || queryCount > 0) && (
        <section
          className="plexon-eqc-geo-snapshot"
          aria-label={EQC_REPORT_COPY.sectionGeoCheck}
          data-eqc-geo-snapshot="combined"
        >
          <div className="plexon-eqc-geo-snapshot__dials">
            {citedShare != null ? (
              <EventQuickCheckScoreRing
                value={citedShare}
                label={EQC_REPORT_COPY.geoSnapshotCitedShare}
                meta={EQC_REPORT_COPY.geoSnapshotCitedShareMeta}
                tone={scoreTone(citedShare)}
                size="lg"
              />
            ) : null}
            {fitness != null ? (
              <EventQuickCheckScoreRing
                value={fitness}
                label={EQC_REPORT_COPY.geoSnapshotFitness}
                meta={EQC_REPORT_COPY.geoSnapshotFitnessMeta}
                tone={scoreTone(fitness)}
              />
            ) : null}
            {queryCount > 0 ? (
              <EventQuickCheckScoreRing
                value={queryCount}
                max={Math.max(queryCount, 12)}
                label={EQC_REPORT_COPY.geoSnapshotPrompts}
                meta={EQC_REPORT_COPY.geoSnapshotPromptsMeta}
              />
            ) : null}
          </div>
          <header className="plexon-eqc-geo-voice__head">
            <Text role="meta" as="p" className="plexon-eqc-geo-eyebrow">
              {EQC_REPORT_COPY.sectionGeoCheck}
            </Text>
            {lede ? <p className="plexon-eqc-geo-snapshot__lede">{lede}</p> : null}
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
