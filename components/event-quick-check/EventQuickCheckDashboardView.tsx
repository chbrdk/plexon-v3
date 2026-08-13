'use client'

import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  Accordion,
  Alert,
  Button,
  Chip,
  RankedList,
  RankedRow,
  SectionChrome,
  Text,
} from '@msqdx/ui'
import { ReportPdfDownloadButton } from '@/components/assistant/ReportPdfDownloadButton'
import { ReportBinaryDownloadButton } from '@/components/assistant/ReportBinaryDownloadButton'
import { EventQuickCheckDomainMagazineSection } from '@/components/event-quick-check/EventQuickCheckDomainMagazineSection'
import { EventQuickCheckDistributionsMagazineSection } from '@/components/event-quick-check/EventQuickCheckDistributionsMagazineSection'
import { EventQuickCheckEeatMagazineSection } from '@/components/event-quick-check/EventQuickCheckEeatMagazineSection'
import { EventQuickCheckGeoMagazineSection } from '@/components/event-quick-check/EventQuickCheckGeoMagazineSection'
import { EventQuickCheckGeoRecommendationsMagazineSection } from '@/components/event-quick-check/EventQuickCheckGeoRecommendationsMagazineSection'
import { EventQuickCheckInsightsMagazineSection } from '@/components/event-quick-check/EventQuickCheckInsightsMagazineSection'
import { EventQuickCheckResultsMasthead } from '@/components/event-quick-check/EventQuickCheckResultsMasthead'
import {
  useEqcPresentationMode,
  type EqcPresentationMode,
} from '@/components/event-quick-check/useEqcPresentationMode'
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types'
import { resolveEventQuickCheckDashboardLayout } from '@/lib/assistant/event-quick-check/resolve-event-quick-check-dashboard-layout'
import { syncKpiTilesFromDomain } from '@/lib/assistant/event-quick-check/hydrate-domain-scan-page-count'
import { EQC_PAGE_COPY } from '@/lib/assistant/event-quick-check/event-quick-check-page-copy'
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy'
import { formatReportGeneratedAt } from '@/lib/assistant/reports/format-report-text'
import { resolveReportPersonas } from '@/lib/assistant/reports/resolve-report-personas'
import { resolveEqcPersonaChatHref } from '@/lib/assistant/event-quick-check/eqc-persona-chat-href'
import { EqcPersonaChatOverlay } from '@/components/event-quick-check/EqcPersonaChatOverlay'
import {
  apiEventQuickCheckRunPdf,
  apiEventQuickCheckRunPptx,
} from '@/lib/paths/event-quick-check-page'
import { pathPlatformProjectDashboard } from '@/lib/constants'
import { syncEqcResultsChapterHeights } from '@/lib/assistant/event-quick-check/eqc-results-chapter-heights'

type Props = {
  report: EventQuickCheckReportModel
  workflowRunId: string
  platformProjectId?: string
  canRerunGeo?: boolean
  /** Public share view: no team actions, only export. */
  readOnly?: boolean
  /** Absolute/relative PDF/PPTX URLs override (public share). */
  pdfUrl?: string
  pptxUrl?: string
  onNewCheck?: () => void
  onOpenHistory?: () => void
  onRerunGeo?: () => void
  onShareLink?: () => void
  shareLinkBusy?: boolean
  shareLinkFeedback?: string | null
}

function Band({
  title,
  meta,
  children,
}: {
  title: string
  meta?: string
  children: ReactNode
}) {
  return (
    <section className="plexon-dash-band" data-section="eqc-magazine-band">
      <SectionChrome
        title={title}
        meta={meta ? <Text role="meta">{meta}</Text> : undefined}
        quiet
      />
      <div className="plexon-eqc-mag-body">{children}</div>
    </section>
  )
}

function TraitBars({
  traits,
}: {
  traits: Array<{ name: string; displayName: string; score: number }>
}) {
  if (!traits.length) return null
  return (
    <ul className="plexon-eqc-mag-traits">
      {traits.map((t) => {
        const pct = Math.round(t.score <= 1 ? t.score * 100 : t.score)
        const width = Math.min(100, Math.max(0, pct))
        return (
          <li key={t.name} className="plexon-eqc-mag-trait">
            <div className="plexon-eqc-mag-trait-row">
              <Text role="hint" as="span">
                {t.displayName}
              </Text>
              <Text role="mono" as="span">
                {pct}%
              </Text>
            </div>
            <div
              className="plexon-eqc-mag-trait-track"
              role="progressbar"
              aria-valuenow={width}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t.displayName}
            >
              <div className="plexon-eqc-mag-trait-fill" style={{ width: `${width}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function MagTable({
  columns,
  rows,
}: {
  columns: string[]
  rows: Array<Array<string | number>>
}) {
  if (!rows.length) return null
  return (
    <div className="plexon-dash-table-wrap">
      <table className="plexon-dash-table is-compact">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * EQC done-state — magazine only: @msqdx/ui primitives + theme tokens (--ink/--line/--muted).
 * No Ui* / MUI bridge organisms.
 */
export function EventQuickCheckDashboardView({
  report,
  workflowRunId,
  platformProjectId,
  canRerunGeo = false,
  readOnly = false,
  pdfUrl: pdfUrlProp,
  pptxUrl: pptxUrlProp,
  onNewCheck,
  onOpenHistory,
  onRerunGeo,
  onShareLink,
  shareLinkBusy = false,
  shareLinkFeedback = null,
}: Props) {
  const router = useRouter()
  const layout = resolveEventQuickCheckDashboardLayout(report)
  const pdfUrl = pdfUrlProp ?? apiEventQuickCheckRunPdf(workflowRunId)
  const pptxUrl = pptxUrlProp ?? apiEventQuickCheckRunPptx(workflowRunId)
  const generatedAt = formatReportGeneratedAt(report.meta.generatedAt)

  const personas = useMemo(() => resolveReportPersonas(report), [report])
  const [personaId, setPersonaId] = useState<string | null>(null)
  const persona =
    personas.find((p) => p.id === (personaId ?? personas[0]?.id)) ?? personas[0] ?? null
  const personaChatHref = useMemo(
    () =>
      resolveEqcPersonaChatHref({
        personaId: persona?.id,
        audionProjectId: report.meta.audionProjectId ?? report.appendix.audionProjectId,
      }),
    [persona?.id, report.meta.audionProjectId, report.appendix.audionProjectId],
  )
  const [personaChatOpen, setPersonaChatOpen] = useState(false)

  const [appendixOpen, setAppendixOpen] = useState<string | null>(null)
  const resultsRootRef = useRef<HTMLDivElement>(null)
  const [eqcMode, setEqcMode] = useState<EqcPresentationMode>('compact')
  const exitPresent = useCallback(() => setEqcMode('compact'), [])
  const {
    presenting,
    chapterIndex,
    chapterCount,
    goToChapter,
  } = useEqcPresentationMode({
    mode: eqcMode,
    resultsRootRef,
    onExitPresent: exitPresent,
  })

  const domain = report.domain
  const insights = report.insights
  const market = report.market
  const kpiTiles = useMemo(() => {
    if (!domain) return report.executive.kpiTiles
    return syncKpiTilesFromDomain(report.executive.kpiTiles, {
      totalPages: domain.totalPages,
      errors: domain.stats.errors,
      score: domain.score,
    })
  }, [domain, report.executive.kpiTiles])

  useLayoutEffect(() => {
    if (eqcMode !== 'present') return
    const root = resultsRootRef.current
    if (!root || typeof ResizeObserver === 'undefined') return

    const sync = () => syncEqcResultsChapterHeights(root)
    sync()

    const ro = new ResizeObserver(sync)
    ro.observe(root)
    for (const child of root.children) {
      if (child instanceof HTMLElement) ro.observe(child)
    }
    window.addEventListener('resize', sync)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', sync)
    }
  }, [report, layout, personaId, appendixOpen, eqcMode])

  return (
    <div
      ref={resultsRootRef}
      className="plexon-magazine plexon-eqc-results"
      data-plexon-event-quick-check-dashboard
      data-section="eqc-magazine-results"
      data-readonly={readOnly ? 'true' : 'false'}
      data-eqc-mode={eqcMode}
    >
      <EventQuickCheckResultsMasthead
        report={report}
        kpiTiles={kpiTiles}
        generatedAt={generatedAt}
        readOnly={readOnly}
        platformProjectId={platformProjectId}
        personaCount={personas.length}
        actions={
          readOnly ? undefined : (
          <>
            <Button
              variant={presenting ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setEqcMode(presenting ? 'compact' : 'present')}
              aria-pressed={presenting}
            >
              {presenting ? EQC_PAGE_COPY.exitPresentButton : EQC_PAGE_COPY.presentButton}
            </Button>
            {onNewCheck ? (
              <Button variant="ghost" size="sm" onClick={onNewCheck}>
                {EQC_PAGE_COPY.newCheckButton}
              </Button>
            ) : null}
            {canRerunGeo && onRerunGeo ? (
              <Button variant="ghost" size="sm" onClick={onRerunGeo}>
                {EQC_PAGE_COPY.geoRerunButton}
              </Button>
            ) : null}
            {onOpenHistory ? (
              <Button variant="ghost" size="sm" onClick={onOpenHistory}>
                {EQC_PAGE_COPY.historyOpenButton}
              </Button>
            ) : null}
            {onShareLink ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onShareLink}
                disabled={shareLinkBusy}
              >
                {shareLinkFeedback ?? EQC_PAGE_COPY.shareLinkButton}
              </Button>
            ) : null}
            {platformProjectId ? (
              <Button
                variant="link"
                size="sm"
                onClick={() => router.push(pathPlatformProjectDashboard(platformProjectId))}
              >
                {EQC_PAGE_COPY.openProjectButton}
              </Button>
            ) : null}
            {report.domainComparison?.checkionProjectHref ? (
              <Button
                variant="link"
                size="sm"
                href={report.domainComparison.checkionProjectHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                {EQC_PAGE_COPY.openCheckionProjectButton}
              </Button>
            ) : null}
            <ReportPdfDownloadButton pdfUrl={pdfUrl} label={EQC_PAGE_COPY.exportPdf} />
            <ReportBinaryDownloadButton
              downloadUrl={pptxUrl}
              label={EQC_PAGE_COPY.exportPptx}
              format="pptx"
            />
          </>
          )
        }
      />

      {layout.showMarket && market ? (
        <Band title={EQC_REPORT_COPY.sectionMarket}>
          <div className="plexon-eqc-mag-stack">
            {market.status === 'failed' && market.errorMessage ? (
              <Alert tone="error">{market.errorMessage}</Alert>
            ) : null}
            {market.executiveSummary ? <Text role="body">{market.executiveSummary}</Text> : null}
            {market.keyFindings.length > 0 ? (
              <RankedList hint={EQC_REPORT_COPY.sectionMarket}>
                {market.keyFindings.map((f, i) => (
                  <RankedRow key={i} index={i + 1} label={f} />
                ))}
              </RankedList>
            ) : null}
            {market.implications ? <Text role="meta">{market.implications}</Text> : null}
            {market.echonHref ? (
              <Button variant="link" size="sm" href={market.echonHref} target="_blank" rel="noopener noreferrer">
                ECHON öffnen
              </Button>
            ) : null}
          </div>
        </Band>
      ) : null}

      {layout.showDomain && domain ? (
        <Band title={EQC_REPORT_COPY.sectionDomain}>
          <EventQuickCheckDomainMagazineSection domain={domain} />
        </Band>
      ) : null}

      {layout.showDistributions && report.distributions ? (
        <Band title={EQC_REPORT_COPY.sectionDistributions}>
          <EventQuickCheckDistributionsMagazineSection distributions={report.distributions} />
        </Band>
      ) : null}

      {layout.showDomainComparison && report.domainComparison?.rows.length ? (
        <Band title={EQC_REPORT_COPY.sectionDomainComparison}>
          <div className="plexon-eqc-mag-stack">
            <MagTable
              columns={['Domain', 'Rolle', 'Score', 'Seiten', 'Fehler']}
              rows={report.domainComparison.rows.map((r) => [
                r.domain,
                r.role === 'own' ? 'Eigene' : 'Wettbewerber',
                r.score,
                r.totalPages,
                r.stats.errors,
              ])}
            />
            {report.domainComparison.checkionProjectHref ? (
              <Button
                variant="link"
                size="sm"
                href={report.domainComparison.checkionProjectHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                {EQC_PAGE_COPY.openCheckionProjectButton}
              </Button>
            ) : null}
          </div>
        </Band>
      ) : null}

      {layout.showPersona && persona ? (
        <Band
          title={
            personas.length > 1 ? EQC_REPORT_COPY.sectionPersonas : EQC_REPORT_COPY.sectionPersona
          }
        >
          <div className="plexon-eqc-mag-stack">
            {personas.length > 1 ? (
              <div className="plexon-eqc-mag-chips">
                <Text role="meta" as="span">
                  {EQC_REPORT_COPY.personaSwitcherLabel}
                </Text>
                {personas.map((p) => (
                  <Chip
                    key={p.id}
                    size="sm"
                    selected={p.id === persona.id}
                    onClick={() => setPersonaId(p.id)}
                  >
                    {p.name}
                  </Chip>
                ))}
              </div>
            ) : null}
            <div className="plexon-eqc-mag-persona-hero">
              <div className="plexon-eqc-mag-persona-hero__identity">
                <Text role="title" as="h3" className="plexon-eqc-mag-persona-name">
                  {persona.name}
                </Text>
                <div className="plexon-eqc-mag-chips">
                  {persona.segment ? (
                    <Chip static size="sm">
                      {persona.segment}
                    </Chip>
                  ) : null}
                  <Chip static size="sm">
                    {Math.round(
                      persona.confidence <= 1 ? persona.confidence * 100 : persona.confidence,
                    )}
                    % {EQC_REPORT_COPY.personaConfidence}
                  </Chip>
                </div>
              </div>
              <div className="plexon-eqc-mag-persona-hero__copy">
                {persona.bio || persona.headline ? (
                  <Text role="meta">{persona.bio || persona.headline}</Text>
                ) : null}
                {persona.traits.length > 0 ? <TraitBars traits={persona.traits} /> : null}
              </div>
            </div>
            {personaChatHref ? (
              <div className="plexon-eqc-mag-persona-actions">
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  data-testid="eqc-persona-chat-cta"
                  onClick={() => setPersonaChatOpen(true)}
                >
                  {EQC_REPORT_COPY.personaChatCta}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  href={personaChatHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="eqc-persona-chat-deep-link"
                >
                  {EQC_REPORT_COPY.personaChatOpenAudion}
                </Button>
              </div>
            ) : null}
            {persona.goals.length > 0 ||
            persona.painPoints.length > 0 ||
            persona.interests.length > 0 ||
            (persona.geoQuestions?.length ?? 0) > 0 ? (
              <div className="plexon-eqc-mag-persona-lists">
                {persona.goals.length > 0 || persona.painPoints.length > 0 ? (
                  <div className="plexon-eqc-mag-persona-pair">
                    {persona.goals.length > 0 ? (
                      <RankedList
                        hint={EQC_REPORT_COPY.sectionGoals}
                        className="plexon-eqc-mag-persona-list"
                      >
                        {persona.goals.map((g, i) => (
                          <RankedRow key={i} index={i + 1} label={g} />
                        ))}
                      </RankedList>
                    ) : null}
                    {persona.painPoints.length > 0 ? (
                      <RankedList
                        hint={EQC_REPORT_COPY.sectionPainPoints}
                        className="plexon-eqc-mag-persona-list"
                      >
                        {persona.painPoints.map((g, i) => (
                          <RankedRow key={i} index={i + 1} label={g} />
                        ))}
                      </RankedList>
                    ) : null}
                  </div>
                ) : null}
                {persona.interests.length > 0 ? (
                  <div
                    className="plexon-eqc-mag-interests"
                    aria-label={EQC_REPORT_COPY.sectionInterests}
                  >
                    <Text role="meta" as="p" className="plexon-eqc-mag-interests__eyebrow">
                      {EQC_REPORT_COPY.sectionInterests}
                    </Text>
                    <ul className="plexon-eqc-mag-interests__flow">
                      {persona.interests.map((interest, i) => (
                        <li key={i} className="plexon-eqc-mag-interests__item">
                          {interest}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {persona.geoQuestions && persona.geoQuestions.length > 0 ? (
                  <RankedList hint={EQC_REPORT_COPY.sectionGeoQuestions}>
                    {persona.geoQuestions.map((q, i) => (
                      <RankedRow key={i} index={i + 1} label={q} />
                    ))}
                  </RankedList>
                ) : null}
              </div>
            ) : null}
          </div>
        </Band>
      ) : null}

      {layout.geoSpan > 0 ? (
        <Band title={EQC_REPORT_COPY.sectionGeo}>
          <EventQuickCheckGeoMagazineSection
            report={report}
            showQuestions
          />
        </Band>
      ) : null}

      {layout.showGeoEeat ? (
        <Band title={EQC_REPORT_COPY.sectionGeoEeat}>
          <EventQuickCheckEeatMagazineSection report={report} />
        </Band>
      ) : null}

      {layout.showGeoRecommendations ? (
        <Band title={EQC_REPORT_COPY.sectionGeoRecommendations}>
          <EventQuickCheckGeoRecommendationsMagazineSection report={report} />
        </Band>
      ) : null}

      {layout.showInsights && insights ? (
        <Band title={EQC_REPORT_COPY.sectionInsights}>
          <EventQuickCheckInsightsMagazineSection
            insights={insights}
            domainLabel={report.meta.domain || report.meta.url}
          />
        </Band>
      ) : null}

      <section className="plexon-dash-band" data-section="eqc-magazine-appendix">
        <Accordion
          aria-label={EQC_REPORT_COPY.sectionAppendix}
          value={appendixOpen}
          onChange={setAppendixOpen}
          items={[
            {
              id: 'appendix',
              title: EQC_REPORT_COPY.sectionAppendix,
              preview: `${report.appendix.stepTable.rows.length} Schritte`,
              panel: (
                <div className="plexon-eqc-mag-stack">
                  {(report.appendix.scanId ||
                    report.appendix.geoJobId ||
                    report.appendix.platformProjectId) && (
                    <div className="plexon-eqc-mag-chips">
                      {report.appendix.scanId ? (
                        <Chip static size="sm">
                          Scan: {report.appendix.scanId}
                        </Chip>
                      ) : null}
                      {report.appendix.geoJobId ? (
                        <Chip static size="sm">
                          GEO: {report.appendix.geoJobId}
                        </Chip>
                      ) : null}
                      {report.appendix.platformProjectId ? (
                        <Chip static size="sm">
                          Projekt: {report.appendix.platformProjectId}
                        </Chip>
                      ) : null}
                    </div>
                  )}
                  <MagTable
                    columns={report.appendix.stepTable.columns}
                    rows={report.appendix.stepTable.rows}
                  />
                  {report.appendix.links.length > 0 ? (
                    <div className="plexon-eqc-mag-chips">
                      {report.appendix.links.map((link) => (
                        <Button
                          key={link.href}
                          variant="link"
                          size="sm"
                          href={link.href}
                          target={link.external ? '_blank' : undefined}
                          rel={link.external ? 'noopener noreferrer' : undefined}
                        >
                          {link.label}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      </section>

      {presenting && chapterCount > 0 ? (
        <div className="plexon-eqc-present-hud" role="navigation" aria-label={EQC_PAGE_COPY.presentHudAria}>
          <div className="plexon-eqc-present-hud__dots">
            {Array.from({ length: chapterCount }, (_, i) => (
              <button
                key={i}
                type="button"
                className="plexon-eqc-present-hud__dot"
                data-active={i === chapterIndex ? 'true' : undefined}
                aria-label={EQC_PAGE_COPY.presentHudLabel(i + 1, chapterCount)}
                aria-current={i === chapterIndex ? 'true' : undefined}
                onClick={() => goToChapter(i)}
              />
            ))}
            <span className="plexon-eqc-present-hud__label">
              {EQC_PAGE_COPY.presentHudLabel(chapterIndex + 1, chapterCount)}
            </span>
          </div>
        </div>
      ) : null}

      <EqcPersonaChatOverlay
        open={personaChatOpen}
        onOpenChange={setPersonaChatOpen}
        personaId={persona?.id}
        personaName={persona?.name}
        audionProjectId={report.meta.audionProjectId ?? report.appendix.audionProjectId}
      />
    </div>
  )
}
