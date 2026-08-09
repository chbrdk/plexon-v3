'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  Accordion,
  Alert,
  Button,
  Chip,
  RankedList,
  RankedRow,
  SectionChrome,
  StatLede,
  StatLedeGroup,
  Text,
  type LedeTone,
} from '@msqdx/ui'
import { ReportPdfDownloadButton } from '@/components/assistant/ReportPdfDownloadButton'
import { ReportBinaryDownloadButton } from '@/components/assistant/ReportBinaryDownloadButton'
import { EventQuickCheckDomainMagazineSection } from '@/components/event-quick-check/EventQuickCheckDomainMagazineSection'
import { EventQuickCheckGeoMagazineSection } from '@/components/event-quick-check/EventQuickCheckGeoMagazineSection'
import { EventQuickCheckInsightsMagazineSection } from '@/components/event-quick-check/EventQuickCheckInsightsMagazineSection'
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types'
import { resolveEventQuickCheckDashboardLayout } from '@/lib/assistant/event-quick-check/resolve-event-quick-check-dashboard-layout'
import { EQC_PAGE_COPY } from '@/lib/assistant/event-quick-check/event-quick-check-page-copy'
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy'
import { formatReportGeneratedAt } from '@/lib/assistant/reports/format-report-text'
import { resolveReportPersonas } from '@/lib/assistant/reports/resolve-report-personas'
import {
  apiEventQuickCheckRunPdf,
  apiEventQuickCheckRunPptx,
} from '@/lib/paths/event-quick-check-page'
import { pathPlatformProjectDashboard } from '@/lib/constants'

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

function kpiTone(value: string | number | undefined): LedeTone | undefined {
  if (typeof value !== 'number') return undefined
  if (value >= 80) return 'ok'
  if (value >= 50) return 'low'
  return 'neg'
}

function alertTone(tone?: string): 'error' | 'ok' | 'info' {
  if (tone === 'success' || tone === 'ok' || tone === 'positive') return 'ok'
  if (tone === 'error' || tone === 'danger' || tone === 'critical') return 'error'
  return 'info'
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

  const [appendixOpen, setAppendixOpen] = useState<string | null>(null)

  const domain = report.domain
  const insights = report.insights
  const market = report.market

  return (
    <div
      className="plexon-magazine plexon-eqc-results"
      data-plexon-event-quick-check-dashboard
      data-section="eqc-magazine-results"
      data-readonly={readOnly ? 'true' : 'false'}
    >
      <SectionChrome
        title={report.meta.title || EQC_PAGE_COPY.pageTitle}
        meta={
          <Text role="meta">
            {[
              report.meta.domain || report.meta.url,
              generatedAt,
              readOnly ? EQC_PAGE_COPY.sharePublicReadOnly : null,
              !readOnly && platformProjectId ? EQC_PAGE_COPY.shareTeamHint : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        }
        action={
          <div className="plexon-eqc-results-actions">
            {!readOnly && onNewCheck ? (
              <Button variant="ghost" size="sm" onClick={onNewCheck}>
                {EQC_PAGE_COPY.newCheckButton}
              </Button>
            ) : null}
            {!readOnly && canRerunGeo && onRerunGeo ? (
              <Button variant="ghost" size="sm" onClick={onRerunGeo}>
                {EQC_PAGE_COPY.geoRerunButton}
              </Button>
            ) : null}
            {!readOnly && onOpenHistory ? (
              <Button variant="ghost" size="sm" onClick={onOpenHistory}>
                {EQC_PAGE_COPY.historyOpenButton}
              </Button>
            ) : null}
            {!readOnly && onShareLink ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onShareLink}
                disabled={shareLinkBusy}
              >
                {shareLinkFeedback ?? EQC_PAGE_COPY.shareLinkButton}
              </Button>
            ) : null}
            {!readOnly && platformProjectId ? (
              <Button
                variant="link"
                size="sm"
                onClick={() => router.push(pathPlatformProjectDashboard(platformProjectId))}
              >
                {EQC_PAGE_COPY.openProjectButton}
              </Button>
            ) : null}
            {!readOnly && report.domainComparison?.checkionProjectHref ? (
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
          </div>
        }
      />

      <Band title="Überblick" meta={EQC_PAGE_COPY.pageTitle}>
        <div className="plexon-eqc-mag-stack">
          <div className="plexon-eqc-mag-chips">
            <Chip static size="sm">
              {report.meta.playbookLabel}
            </Chip>
            {report.meta.url ? (
              <Chip static size="sm">
                {report.meta.url}
              </Chip>
            ) : null}
            {report.meta.checkionOnly ? (
              <Chip static size="sm">
                CHECKION
              </Chip>
            ) : null}
          </div>
          {report.executive.summary ? <Text role="body">{report.executive.summary}</Text> : null}
          {layout.showExecutiveFazit && report.executive.fazit ? (
            <Alert tone={alertTone(report.executive.fazitTone)}>{report.executive.fazit}</Alert>
          ) : null}
        </div>
      </Band>

      {report.executive.kpiTiles.length > 0 ? (
        <Band title={EQC_REPORT_COPY.sectionKpi}>
          <StatLedeGroup
            aria-label={EQC_REPORT_COPY.sectionKpi}
            columns={report.executive.kpiTiles.length}
            compact
          >
            {report.executive.kpiTiles.map((tile, i) => (
              <StatLede
                key={`${tile.label}-${i}`}
                label={tile.label}
                value={String(tile.value ?? '—')}
                unit={tile.unit}
                tone={kpiTone(typeof tile.value === 'number' ? tile.value : undefined)}
              />
            ))}
          </StatLedeGroup>
        </Band>
      ) : null}

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
            <Text role="title" as="h3">
              {persona.name}
            </Text>
            <div className="plexon-eqc-mag-chips">
              {persona.segment ? (
                <Chip static size="sm">
                  {persona.segment}
                </Chip>
              ) : null}
              <Chip static size="sm">
                {Math.round(persona.confidence <= 1 ? persona.confidence * 100 : persona.confidence)}%
              </Chip>
            </div>
            {persona.headline ? <Text role="body">{persona.headline}</Text> : null}
            {persona.bio ? <Text role="meta">{persona.bio}</Text> : null}
            <TraitBars traits={persona.traits} />
            {persona.goals.length > 0 ? (
              <RankedList hint={EQC_REPORT_COPY.sectionGoals}>
                {persona.goals.map((g, i) => (
                  <RankedRow key={i} index={i + 1} label={g} />
                ))}
              </RankedList>
            ) : null}
            {persona.painPoints.length > 0 ? (
              <RankedList hint={EQC_REPORT_COPY.sectionPainPoints}>
                {persona.painPoints.map((g, i) => (
                  <RankedRow key={i} index={i + 1} label={g} />
                ))}
              </RankedList>
            ) : null}
            {(persona.geoQuestions?.length ?? 0) > 0 ? (
              <RankedList hint={EQC_REPORT_COPY.sectionGeoQuestions}>
                {(persona.geoQuestions ?? []).map((q, i) => (
                  <RankedRow key={i} index={i + 1} label={q} />
                ))}
              </RankedList>
            ) : null}
          </div>
        </Band>
      ) : null}

      {layout.geoSpan > 0 ? (
        <Band title={EQC_REPORT_COPY.sectionGeo}>
          <EventQuickCheckGeoMagazineSection
            report={report}
            showQuestions={!layout.showPersona}
          />
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
    </div>
  )
}
