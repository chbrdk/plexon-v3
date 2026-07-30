'use client';

import { useRouter } from 'next/navigation';
import { Box, Stack } from '@mui/material';
import { MsqdxButton } from '@msqdx/react';
import { MSQDX_SPACING } from '@msqdx/tokens';
import { EventQuickCheckDashboardPanel } from '@/components/event-quick-check/EventQuickCheckDashboardPanel';
import {
  EventQuickCheckAppendixSection,
  EventQuickCheckDomainSection,
  EventQuickCheckDomainComparisonSection,
  EventQuickCheckExecutiveHeader,
  EventQuickCheckGeoSection,
  EventQuickCheckInsightsSection,
  EventQuickCheckKpiSection,
  EventQuickCheckMarketSection,
  EventQuickCheckPersonaSection,
} from '@/components/assistant/reports/event-quick-check/EventQuickCheckReportSections';
import { ReportPdfDownloadButton } from '@/components/assistant/ReportPdfDownloadButton';
import { ReportBinaryDownloadButton } from '@/components/assistant/ReportBinaryDownloadButton';
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types';
import { resolveEventQuickCheckDashboardLayout } from '@/lib/assistant/event-quick-check/resolve-event-quick-check-dashboard-layout';
import { EQC_PAGE_COPY } from '@/lib/assistant/event-quick-check/event-quick-check-page-copy';
import {
  EQC_SECTION_HELP,
  eqcSectionHelpAriaLabel,
} from '@/lib/assistant/event-quick-check/event-quick-check-section-help';
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy';
import {
  apiEventQuickCheckRunPdf,
  apiEventQuickCheckRunPptx,
} from '@/lib/paths/event-quick-check-page';
import { pathPlatformProjectDashboard } from '@/lib/constants';
import {
  THEME_ACCENT_OUTLINED_BUTTON_SX,
  THEME_ACCENT_TEXT_BUTTON_SX,
} from '@/lib/theme-accent';

type Props = {
  report: EventQuickCheckReportModel;
  workflowRunId: string;
  platformProjectId?: string;
  canRerunGeo?: boolean;
  onNewCheck: () => void;
  onOpenHistory: () => void;
  onRerunGeo?: () => void;
};

const DASHBOARD_MAX_WIDTH = 1440;

export function EventQuickCheckDashboardView({
  report,
  workflowRunId,
  platformProjectId,
  canRerunGeo = false,
  onNewCheck,
  onOpenHistory,
  onRerunGeo,
}: Props) {
  const router = useRouter();
  const layout = resolveEventQuickCheckDashboardLayout(report);
  const pdfUrl = apiEventQuickCheckRunPdf(workflowRunId);
  const pptxUrl = apiEventQuickCheckRunPptx(workflowRunId);

  const geoSpan = layout.geoSpan > 0 ? layout.geoSpan : 12;

  return (
    <Box
      data-plexon-event-quick-check-dashboard
      sx={{
        px: { xs: 2, md: 4 },
        py: { xs: 2, md: 3 },
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: `${MSQDX_SPACING.scale.lg}px`, maxWidth: DASHBOARD_MAX_WIDTH, mx: 'auto', width: '100%' }}
      >
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <MsqdxButton variant="outlined" sx={THEME_ACCENT_OUTLINED_BUTTON_SX} onClick={onNewCheck}>
            {EQC_PAGE_COPY.newCheckButton}
          </MsqdxButton>
          {canRerunGeo && onRerunGeo ? (
            <MsqdxButton variant="outlined" sx={THEME_ACCENT_OUTLINED_BUTTON_SX} onClick={onRerunGeo}>
              {EQC_PAGE_COPY.geoRerunButton}
            </MsqdxButton>
          ) : null}
          <MsqdxButton variant="outlined" sx={THEME_ACCENT_OUTLINED_BUTTON_SX} onClick={onOpenHistory}>
            {EQC_PAGE_COPY.historyOpenButton}
          </MsqdxButton>
          {platformProjectId ? (
            <MsqdxButton
              variant="text"
              sx={THEME_ACCENT_TEXT_BUTTON_SX}
              onClick={() => router.push(pathPlatformProjectDashboard(platformProjectId))}
            >
              {EQC_PAGE_COPY.openProjectButton}
            </MsqdxButton>
          ) : null}
          {report.domainComparison?.checkionProjectHref ? (
            <MsqdxButton
              variant="text"
              sx={THEME_ACCENT_TEXT_BUTTON_SX}
              onClick={() =>
                window.open(report.domainComparison!.checkionProjectHref!, '_blank', 'noopener,noreferrer')
              }
            >
              {EQC_PAGE_COPY.openCheckionProjectButton}
            </MsqdxButton>
          ) : null}
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <ReportPdfDownloadButton
            pdfUrl={pdfUrl}
            label={EQC_PAGE_COPY.exportPdf}
            sx={THEME_ACCENT_OUTLINED_BUTTON_SX}
          />
          <ReportBinaryDownloadButton
            downloadUrl={pptxUrl}
            label={EQC_PAGE_COPY.exportPptx}
            format="pptx"
            sx={THEME_ACCENT_OUTLINED_BUTTON_SX}
          />
        </Stack>
      </Stack>

      <Box
        sx={{
          maxWidth: DASHBOARD_MAX_WIDTH,
          mx: 'auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: `${MSQDX_SPACING.scale.md}px`,
        }}
      >
        <EventQuickCheckDashboardPanel
          title={report.meta.title}
          icon="insights"
          eyebrow={EQC_PAGE_COPY.pageTitle}
          infoTooltip={EQC_SECTION_HELP.overview}
          infoTooltipAriaLabel={eqcSectionHelpAriaLabel(EQC_PAGE_COPY.pageTitle)}
        >
          <EventQuickCheckExecutiveHeader report={report} hideTitle />
        </EventQuickCheckDashboardPanel>

        {report.executive.kpiTiles.length > 0 ? (
          <EventQuickCheckDashboardPanel
            title={EQC_REPORT_COPY.sectionKpi}
            icon="speed"
            infoTooltip={EQC_SECTION_HELP.kpi}
            infoTooltipAriaLabel={eqcSectionHelpAriaLabel(EQC_REPORT_COPY.sectionKpi)}
          >
            <EventQuickCheckKpiSection report={report} bare />
          </EventQuickCheckDashboardPanel>
        ) : null}

        {layout.showMarket ? (
          <EventQuickCheckDashboardPanel
            title={EQC_REPORT_COPY.sectionMarket}
            icon="trending_up"
            infoTooltip={EQC_SECTION_HELP.market}
            infoTooltipAriaLabel={eqcSectionHelpAriaLabel(EQC_REPORT_COPY.sectionMarket)}
          >
            <EventQuickCheckMarketSection report={report} />
          </EventQuickCheckDashboardPanel>
        ) : null}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(12, 1fr)' },
            gap: `${MSQDX_SPACING.scale.md}px`,
            alignItems: 'stretch',
          }}
        >
          {layout.showDomain ? (
            <EventQuickCheckDashboardPanel
              title={EQC_REPORT_COPY.sectionDomain}
              icon="language"
              gridColumn={{ xs: '1 / -1', lg: `span ${layout.domainSpan}` }}
              infoTooltip={EQC_SECTION_HELP.domain}
              infoTooltipAriaLabel={eqcSectionHelpAriaLabel(EQC_REPORT_COPY.sectionDomain)}
            >
              <EventQuickCheckDomainSection report={report} />
            </EventQuickCheckDashboardPanel>
          ) : null}

          {layout.showDomainComparison ? (
            <EventQuickCheckDashboardPanel
              title={EQC_REPORT_COPY.sectionDomainComparison}
              icon="compare_arrows"
              gridColumn={{ xs: '1 / -1', lg: 'span 12' }}
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
              icon="person"
              gridColumn={{ xs: '1 / -1', lg: `span ${layout.personaSpan}` }}
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
              icon="public"
              gridColumn={{ xs: '1 / -1', lg: `span ${geoSpan}` }}
              infoTooltip={EQC_SECTION_HELP.geo}
              infoTooltipAriaLabel={eqcSectionHelpAriaLabel(EQC_REPORT_COPY.sectionGeo)}
            >
              <EventQuickCheckGeoSection report={report} compact />
            </EventQuickCheckDashboardPanel>
          ) : null}

          {layout.showInsights ? (
            <EventQuickCheckDashboardPanel
              title={EQC_REPORT_COPY.sectionInsights}
              icon="lightbulb"
              gridColumn={{ xs: '1 / -1', lg: 'span 12' }}
              infoTooltip={EQC_SECTION_HELP.insights}
              infoTooltipAriaLabel={eqcSectionHelpAriaLabel(EQC_REPORT_COPY.sectionInsights)}
            >
              <EventQuickCheckInsightsSection report={report} />
            </EventQuickCheckDashboardPanel>
          ) : null}
        </Box>

        <EventQuickCheckAppendixSection report={report} />
      </Box>
    </Box>
  );
}
