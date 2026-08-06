'use client'

import { useRouter } from 'next/navigation'
import { Button, SectionChrome, StatLede, StatLedeGroup } from '@msqdx/ui'
import { EventQuickCheckDashboardPanel } from '@/components/event-quick-check/EventQuickCheckDashboardPanel'
import {
  EventQuickCheckAppendixSection,
  EventQuickCheckDomainSection,
  EventQuickCheckDomainComparisonSection,
  EventQuickCheckExecutiveHeader,
  EventQuickCheckGeoSection,
  EventQuickCheckInsightsSection,
  EventQuickCheckMarketSection,
  EventQuickCheckPersonaSection,
} from '@/components/assistant/reports/event-quick-check/EventQuickCheckReportSections'
import { ReportPdfDownloadButton } from '@/components/assistant/ReportPdfDownloadButton'
import { ReportBinaryDownloadButton } from '@/components/assistant/ReportBinaryDownloadButton'
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types'
import { resolveEventQuickCheckDashboardLayout } from '@/lib/assistant/event-quick-check/resolve-event-quick-check-dashboard-layout'
import { EQC_PAGE_COPY } from '@/lib/assistant/event-quick-check/event-quick-check-page-copy'
import {
  EQC_SECTION_HELP,
  eqcSectionHelpAriaLabel,
} from '@/lib/assistant/event-quick-check/event-quick-check-section-help'
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy'
import {
  apiEventQuickCheckRunPdf,
  apiEventQuickCheckRunPptx,
} from '@/lib/paths/event-quick-check-page'
import { pathPlatformProjectDashboard } from '@/lib/constants'
import type { LedeTone } from '@msqdx/ui'

type Props = {
  report: EventQuickCheckReportModel
  workflowRunId: string
  platformProjectId?: string
  canRerunGeo?: boolean
  onNewCheck: () => void
  onOpenHistory: () => void
  onRerunGeo?: () => void
}

function kpiTone(value: string | number | undefined): LedeTone | undefined {
  if (typeof value !== 'number') return undefined
  if (value >= 80) return 'ok'
  if (value >= 50) return 'low'
  return 'neg'
}

export function EventQuickCheckDashboardView({
  report,
  workflowRunId,
  platformProjectId,
  canRerunGeo = false,
  onNewCheck,
  onOpenHistory,
  onRerunGeo,
}: Props) {
  const router = useRouter()
  const layout = resolveEventQuickCheckDashboardLayout(report)
  const pdfUrl = apiEventQuickCheckRunPdf(workflowRunId)
  const pptxUrl = apiEventQuickCheckRunPptx(workflowRunId)
  const kpiTiles = report.executive.kpiTiles

  return (
    <div
      className="plexon-magazine plexon-eqc-results"
      data-plexon-event-quick-check-dashboard
    >
      <header className="plexon-eqc-results-header">
        <SectionChrome
          title={report.meta.title || EQC_PAGE_COPY.pageTitle}
          meta={EQC_PAGE_COPY.pageTitle}
          action={
            <div className="plexon-eqc-results-actions">
              <Button variant="ghost" size="sm" onClick={onNewCheck}>
                {EQC_PAGE_COPY.newCheckButton}
              </Button>
              {canRerunGeo && onRerunGeo ? (
                <Button variant="ghost" size="sm" onClick={onRerunGeo}>
                  {EQC_PAGE_COPY.geoRerunButton}
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" onClick={onOpenHistory}>
                {EQC_PAGE_COPY.historyOpenButton}
              </Button>
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
                  onClick={() =>
                    window.open(
                      report.domainComparison!.checkionProjectHref!,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }
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
      </header>

      <EventQuickCheckDashboardPanel
        title="Überblick"
        eyebrow={EQC_PAGE_COPY.pageTitle}
        infoTooltip={EQC_SECTION_HELP.overview}
        infoTooltipAriaLabel={eqcSectionHelpAriaLabel(EQC_PAGE_COPY.pageTitle)}
      >
        <EventQuickCheckExecutiveHeader report={report} hideTitle />
      </EventQuickCheckDashboardPanel>

      {kpiTiles.length > 0 ? (
        <section className="plexon-eqc-band plexon-dash-band" data-section="eqc-kpi">
          <SectionChrome title={EQC_REPORT_COPY.sectionKpi} quiet />
          <StatLedeGroup className="plexon-eqc-kpi-lede" aria-label={EQC_REPORT_COPY.sectionKpi}>
            {kpiTiles.map((tile, index) => (
              <StatLede
                key={`${tile.label}-${index}`}
                label={tile.label}
                value={String(tile.value ?? '—')}
                unit={tile.unit}
                tone={kpiTone(typeof tile.value === 'number' ? tile.value : undefined)}
              />
            ))}
          </StatLedeGroup>
        </section>
      ) : null}

      {layout.showMarket ? (
        <EventQuickCheckDashboardPanel
          title={EQC_REPORT_COPY.sectionMarket}
          infoTooltip={EQC_SECTION_HELP.market}
          infoTooltipAriaLabel={eqcSectionHelpAriaLabel(EQC_REPORT_COPY.sectionMarket)}
        >
          <EventQuickCheckMarketSection report={report} />
        </EventQuickCheckDashboardPanel>
      ) : null}

      {layout.showDomain ? (
        <EventQuickCheckDashboardPanel
          title={EQC_REPORT_COPY.sectionDomain}
          infoTooltip={EQC_SECTION_HELP.domain}
          infoTooltipAriaLabel={eqcSectionHelpAriaLabel(EQC_REPORT_COPY.sectionDomain)}
        >
          <EventQuickCheckDomainSection report={report} />
        </EventQuickCheckDashboardPanel>
      ) : null}

      {layout.showDomainComparison ? (
        <EventQuickCheckDashboardPanel
          title={EQC_REPORT_COPY.sectionDomainComparison}
          infoTooltip={EQC_SECTION_HELP.domainComparison}
          infoTooltipAriaLabel={eqcSectionHelpAriaLabel(EQC_REPORT_COPY.sectionDomainComparison)}
        >
          <EventQuickCheckDomainComparisonSection report={report} />
        </EventQuickCheckDashboardPanel>
      ) : null}

      {layout.showPersona ? (
        <EventQuickCheckDashboardPanel
          title={
            (report.personas?.length ?? 0) > 1
              ? EQC_REPORT_COPY.sectionPersonas
              : EQC_REPORT_COPY.sectionPersona
          }
          infoTooltip={EQC_SECTION_HELP.persona}
          infoTooltipAriaLabel={eqcSectionHelpAriaLabel(
            (report.personas?.length ?? 0) > 1
              ? EQC_REPORT_COPY.sectionPersonas
              : EQC_REPORT_COPY.sectionPersona
          )}
        >
          <EventQuickCheckPersonaSection report={report} />
        </EventQuickCheckDashboardPanel>
      ) : null}

      {layout.geoSpan > 0 ? (
        <EventQuickCheckDashboardPanel
          title={EQC_REPORT_COPY.sectionGeo}
          infoTooltip={EQC_SECTION_HELP.geo}
          infoTooltipAriaLabel={eqcSectionHelpAriaLabel(EQC_REPORT_COPY.sectionGeo)}
        >
          <EventQuickCheckGeoSection report={report} compact />
        </EventQuickCheckDashboardPanel>
      ) : null}

      {layout.showInsights ? (
        <EventQuickCheckDashboardPanel
          title={EQC_REPORT_COPY.sectionInsights}
          infoTooltip={EQC_SECTION_HELP.insights}
          infoTooltipAriaLabel={eqcSectionHelpAriaLabel(EQC_REPORT_COPY.sectionInsights)}
        >
          <EventQuickCheckInsightsSection report={report} />
        </EventQuickCheckDashboardPanel>
      ) : null}

      <details className="plexon-eqc-appendix-band">
        <summary className="plexon-eqc-appendix-summary">{EQC_REPORT_COPY.sectionAppendix}</summary>
        <div className="plexon-eqc-band-body">
          <EventQuickCheckAppendixSection report={report} bare />
        </div>
      </details>
    </div>
  )
}
