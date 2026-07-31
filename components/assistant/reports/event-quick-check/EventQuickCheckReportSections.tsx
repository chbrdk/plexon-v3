'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Chip, Collapse, LinearProgress, Stack, Typography } from '@mui/material';
import { MSQDX_COLORS, MSQDX_SPACING, MSQDX_TYPOGRAPHY } from '@msqdx/tokens';
import type {
  EventQuickCheckReportModel,
  EventQuickCheckReportPersonaTrait,
} from '@/lib/assistant/reports/event-quick-check-report-types';
import { resolveReportPersonas } from '@/lib/assistant/reports/resolve-report-personas';
import { UiAlertBlock } from '@/components/assistant-ui/organisms/UiAlertBlock';
import { UiDataTable } from '@/components/assistant-ui/organisms/UiDataTable';
import { UiFindingList } from '@/components/assistant-ui/organisms/UiFindingList';
import { UiKeyValueList } from '@/components/assistant-ui/organisms/UiKeyValueList';
import { UiLinkList } from '@/components/assistant-ui/organisms/UiLinkList';
import { UiMetricGrid } from '@/components/assistant-ui/organisms/UiMetricGrid';
import { UiMetricTile } from '@/components/assistant-ui/molecules/UiMetricTile';
import { UiPersonaCardBlock } from '@/components/assistant-ui/organisms/UiPersonaCardBlock';
import { UiRecommendationList } from '@/components/assistant-ui/organisms/UiRecommendationList';
import { ReportSectionHeader } from '@/components/assistant/reports/ReportSectionHeader';
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface';
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy';
import { EventQuickCheckGeoCharts } from '@/components/event-quick-check/EventQuickCheckGeoCharts';
import { EventQuickCheckCitationSection } from '@/components/event-quick-check/EventQuickCheckCitationSection';
import { formatReportGeneratedAt } from '@/lib/assistant/reports/format-report-text';
import {
  EQC_SECTION_HELP,
  eqcSectionHelpAriaLabel,
} from '@/lib/assistant/event-quick-check/event-quick-check-section-help';
import { InfoTooltip } from '@/components/InfoTooltip';
import { PLEXON_META_CHIP_SX } from '@/lib/theme-accent';

export function stepStatusColor(status: string): 'success' | 'error' | 'default' | 'warning' {
  if (status === 'done') return 'success';
  if (status === 'error') return 'error';
  if (status === 'skipped') return 'warning';
  return 'default';
}

function TraitBars({ traits }: { traits: EventQuickCheckReportPersonaTrait[] }) {
  if (!traits || !Array.isArray(traits) || traits.length === 0) return null;
  return (
    <Stack spacing={1} sx={{ mt: 1 }}>
      {traits.map((t) => {
        const pct = Math.round(t.score <= 1 ? t.score * 100 : t.score);
        return (
          <Box key={t.name}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
              <Typography variant="caption">{t.displayName}</Typography>
              <Typography variant="caption">{pct}%</Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, pct)}
              sx={{
                height: 6,
                borderRadius: 1,
                bgcolor: MSQDX_COLORS.greyLight,
                '& .MuiLinearProgress-bar': { bgcolor: MSQDX_COLORS.brand.pink },
              }}
            />
          </Box>
        );
      })}
    </Stack>
  );
}

type SectionProps = {
  report: EventQuickCheckReportModel;
};

export function EventQuickCheckExecutiveHeader({
  report,
  hideTitle = false,
}: SectionProps & { hideTitle?: boolean }) {
  const generatedAtLabel = formatReportGeneratedAt(report.meta.generatedAt);

  return (
    <Box sx={{ color: 'var(--color-text-on-light)' }}>
      {!hideTitle ? (
        <Typography variant="h5" sx={{ fontWeight: MSQDX_TYPOGRAPHY.fontWeight.bold, mb: 0.5 }}>
          {report.meta.title}
        </Typography>
      ) : null}
      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
        <Chip size="small" label={report.meta.domain} variant="outlined" sx={PLEXON_META_CHIP_SX} />
        <Chip size="small" label={report.meta.projectName} variant="outlined" sx={PLEXON_META_CHIP_SX} />
        {generatedAtLabel ? (
          <Chip size="small" label={generatedAtLabel} variant="outlined" sx={PLEXON_META_CHIP_SX} />
        ) : null}
      </Stack>
      {report.meta.url ? (
        <Typography variant="body2" sx={{ color: 'var(--color-text-on-light)' }}>
          {report.meta.url}
        </Typography>
      ) : null}
      {report.executive.summary ? (
        <Typography variant="body1" sx={{ mt: 1.5 }}>
          {report.executive.summary}
        </Typography>
      ) : null}
      {report.executive.fazit ? (
        <Box sx={{ mt: 1.5 }}>
          <UiAlertBlock
            tone={report.executive.fazitTone ?? 'info'}
            title={EQC_REPORT_COPY.fazit}
            message={report.executive.fazit}
          />
        </Box>
      ) : null}
    </Box>
  );
}

function KpiTileGrid({ report }: SectionProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))',
        gap: `${MSQDX_SPACING.gap.sm}px`,
      }}
    >
      {report.executive.kpiTiles.map((item) => (
        <UiMetricTile key={`${item.label}-${item.value}`} item={item} />
      ))}
    </Box>
  );
}

export function EventQuickCheckKpiSection({
  report,
  bare = false,
}: SectionProps & { bare?: boolean }) {
  if (report.executive.kpiTiles.length === 0) return null;
  if (bare) return <KpiTileGrid report={report} />;
  return <UiMetricGrid title={EQC_REPORT_COPY.sectionKpi} items={report.executive.kpiTiles} />;
}

export function EventQuickCheckWorkflowSection({ report }: SectionProps) {
  return (
    <Stack spacing={1}>
      {report.workflow.steps.map((s) => (
        <Box
          key={s.id}
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 1,
            py: 0.75,
            borderBottom: '1px solid',
            borderColor: 'divider',
            '&:last-child': { borderBottom: 'none' },
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {s.label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {s.detail}
            </Typography>
          </Box>
          <Chip size="small" label={s.status} color={stepStatusColor(s.status)} variant="outlined" />
        </Box>
      ))}
    </Stack>
  );
}

export function EventQuickCheckDomainSection({ report }: SectionProps) {
  if (!report.domain) return null;
  return (
    <Stack spacing={1.5}>
      <UiMetricGrid
        title={EQC_REPORT_COPY.sectionDomainScan}
        items={[
          { label: 'Domain-Score', value: report.domain.score, unit: '/100' },
          { label: 'Seiten', value: report.domain.totalPages },
          { label: 'Fehler', value: report.domain.stats.errors },
          { label: 'Warnungen', value: report.domain.stats.warnings },
        ]}
      />
      {report.domain.topIssues.length > 0 ? (
        <UiDataTable
          title={EQC_REPORT_COPY.sectionTopIssues}
          columns={[EQC_REPORT_COPY.colIssue, EQC_REPORT_COPY.colPages]}
          rows={report.domain.topIssues.map((i) => [i.title, i.count])}
        />
      ) : null}
    </Stack>
  );
}

export function EventQuickCheckDomainComparisonSection({ report }: SectionProps) {
  const comparison = report.domainComparison;
  if (!comparison?.rows.length) return null;

  return (
    <Stack spacing={1.5}>
      <UiDataTable
        title={EQC_REPORT_COPY.sectionDomainComparison}
        columns={[
          EQC_REPORT_COPY.colDomain,
          EQC_REPORT_COPY.colRole,
          EQC_REPORT_COPY.colScore,
          EQC_REPORT_COPY.colPages,
          'Fehler',
          'Warnungen',
        ]}
        rows={comparison.rows.map((row) => [
          row.domain,
          row.role === 'own' ? EQC_REPORT_COPY.domainRoleOwn : EQC_REPORT_COPY.domainRoleCompetitor,
          `${row.score}/100`,
          row.totalPages,
          row.stats.errors,
          row.stats.warnings,
        ])}
      />
      {comparison.failedDomains?.length ? (
        <Typography variant="body2" color="text.secondary">
          {EQC_REPORT_COPY.domainComparisonFailed}: {comparison.failedDomains.join(' · ')}
        </Typography>
      ) : null}
      {comparison.checkionProjectHref ? (
        <UiLinkList
          title={EQC_REPORT_COPY.links}
          links={[
            {
              label: EQC_REPORT_COPY.linkCheckionProject,
              href: comparison.checkionProjectHref,
              external: true,
            },
          ]}
        />
      ) : null}
    </Stack>
  );
}

export function EventQuickCheckPersonaSection({ report }: SectionProps) {
  const personas = useMemo(() => resolveReportPersonas(report), [report.persona, report.personas]);
  const [activePersonaId, setActivePersonaId] = useState(personas[0]?.id ?? '');

  useEffect(() => {
    if (!personas.some((p) => p.id === activePersonaId)) {
      setActivePersonaId(personas[0]?.id ?? '');
    }
  }, [personas, activePersonaId]);

  if (!personas.length) return null;

  const persona = personas.find((p) => p.id === activePersonaId) ?? personas[0];
  const geoQuestions =
    persona.geoQuestions?.length ? persona.geoQuestions : personas.length === 1 ? report.geo.questions : [];

  return (
    <Stack spacing={1.5}>
      {personas.length > 1 ? (
        <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap alignItems="center">
          <Chip
            size="small"
            label={EQC_REPORT_COPY.personaSwitcherLabel}
            variant="outlined"
            sx={{ ...PLEXON_META_CHIP_SX, pointerEvents: 'none' }}
          />
          {personas.map((p) => {
            const selected = p.id === persona.id;
            return (
              <Chip
                key={p.id}
                size="small"
                label={p.name}
                title={p.segment}
                variant={selected ? 'filled' : 'outlined'}
                onClick={() => setActivePersonaId(p.id)}
                sx={{
                  ...PLEXON_META_CHIP_SX,
                  ...(selected
                    ? {
                        bgcolor: 'var(--color-theme-accent) !important',
                        borderColor: 'var(--color-theme-accent) !important',
                        color: 'var(--color-theme-accent-contrast, #000) !important',
                        '& .MuiChip-label': {
                          color: 'var(--color-theme-accent-contrast, #000) !important',
                        },
                      }
                    : {}),
                }}
              />
            );
          })}
        </Stack>
      ) : null}
      <UiPersonaCardBlock
        title={persona.name}
        hideHeader
        fullWidth
        personas={[
          {
            id: persona.id,
            name: persona.name,
            segment: persona.segment,
            confidence: persona.confidence,
            headline: persona.headline,
          },
        ]}
      />
      {persona.bio ? <Typography variant="body2">{persona.bio}</Typography> : null}
      <TraitBars traits={persona.traits} />
      {geoQuestions.length > 0 ? (
        <UiRecommendationList
          title={EQC_REPORT_COPY.sectionGeoQuestions}
          items={geoQuestions.map((q, i) => ({ title: `${i + 1}. ${q}` }))}
        />
      ) : null}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: `${MSQDX_SPACING.scale.sm}px`,
        }}
      >
        {persona.goals.length > 0 ? (
          <UiFindingList
            title={EQC_REPORT_COPY.sectionGoals}
            showSeverityBadge={false}
            itemTint
            items={persona.goals.map((g) => ({
              title: g,
              description: '',
              severity: 'success' as const,
            }))}
          />
        ) : null}
        {persona.painPoints.length > 0 ? (
          <UiFindingList
            title={EQC_REPORT_COPY.sectionPainPoints}
            showSeverityBadge={false}
            itemTint
            items={persona.painPoints.map((p) => ({
              title: p,
              description: '',
              severity: 'warning' as const,
            }))}
          />
        ) : null}
      </Box>
    </Stack>
  );
}

export function EventQuickCheckMarketSection({ report }: SectionProps) {
  const market = report.market;
  if (!market) return null;

  const statusTone =
    market.status === 'complete'
      ? 'success'
      : market.status === 'partial'
        ? 'warning'
        : market.status === 'failed'
          ? 'error'
          : 'info';

  return (
    <Stack spacing={1.5}>
      {market.status !== 'complete' ? (
        <UiAlertBlock
          tone={statusTone}
          title={EQC_REPORT_COPY.sectionMarket}
          message={
            market.errorMessage ??
            (market.status === 'skipped'
              ? EQC_REPORT_COPY.marketSkipped
              : EQC_REPORT_COPY.marketIncomplete)
          }
        />
      ) : null}
      {market.executiveSummary ? (
        <Typography variant="body1">{market.executiveSummary}</Typography>
      ) : null}
      {market.keyFindings.length > 0 ? (
        <UiRecommendationList
          title={EQC_REPORT_COPY.sectionMarketFindings}
          items={market.keyFindings.map((finding, i) => ({
            title: `${i + 1}. ${finding}`,
          }))}
        />
      ) : null}
      {market.implications ? (
        <Typography variant="body2" sx={{ color: 'var(--color-text-on-light)' }}>
          {market.implications}
        </Typography>
      ) : null}
      {market.echonHref ? (
        <UiLinkList
          links={[{ label: EQC_REPORT_COPY.linkEchonResearch, href: market.echonHref, external: true }]}
        />
      ) : null}
    </Stack>
  );
}

export function EventQuickCheckGeoSection({
  report,
  compact = false,
}: SectionProps & { compact?: boolean }) {
  const { geo } = report;
  const showGeoQuestionsInGeo = geo.questions.length > 0 && !report.persona;
  const showCompetitorBlock = !compact && geo.competitors.length > 0;
  const hasContent =
    geo.status !== 'skipped' ||
    showGeoQuestionsInGeo ||
    showCompetitorBlock ||
    geo.eeatDimensions.length > 0 ||
    geo.citationHighlights.length > 0 ||
    (geo.citationHighlightsByModel?.length ?? 0) > 0 ||
    geo.overallScore != null ||
    geo.geoFitnessScore != null ||
    geo.recommendations.length > 0;

  if (!hasContent) return null;

  return (
    <Stack spacing={1.5}>
      {geo.status === 'failed' || geo.status === 'partial' ? (
        <UiAlertBlock
          tone="warning"
          title={EQC_REPORT_COPY.sectionGeoCheck}
          message={geo.errorMessage ?? EQC_REPORT_COPY.geoIncomplete}
        />
      ) : null}

      {geo.overallScore != null || geo.geoFitnessScore != null ? (
        <UiMetricGrid
          title={EQC_REPORT_COPY.sectionGeoMetrics}
          items={[
            ...(geo.overallScore != null
              ? [{ label: EQC_REPORT_COPY.kpiShareOfVoice, value: geo.overallScore, unit: '/100' }]
              : []),
            ...(geo.geoFitnessScore != null
              ? [{ label: EQC_REPORT_COPY.kpiGeoFitness, value: geo.geoFitnessScore, unit: '/100' }]
              : []),
          ]}
        />
      ) : null}

      {geo.eeatDimensions.length > 0 ? (
        <UiMetricGrid
          title={EQC_REPORT_COPY.sectionGeoEeat}
          items={geo.eeatDimensions.map((d) => ({
            label: d.label,
            value: d.score,
            unit: '/100',
            hint: compact ? undefined : d.reasoning,
          }))}
        />
      ) : null}

      {showGeoQuestionsInGeo ? (
        <UiRecommendationList
          title={EQC_REPORT_COPY.sectionGeoQuestions}
          items={geo.questions.map((q, i) => ({ title: `${i + 1}. ${q}` }))}
        />
      ) : null}

      {showCompetitorBlock ? (
        <>
          <EventQuickCheckGeoCharts competitors={geo.competitors} />
          <UiDataTable
            title={EQC_REPORT_COPY.competitors}
            columns={[EQC_REPORT_COPY.colDomain, EQC_REPORT_COPY.colScore]}
            rows={geo.competitors.map((c) => [c.name, c.score ?? '—'])}
          />
        </>
      ) : null}

      {geo.citationHighlights.length > 0 || (geo.citationHighlightsByModel?.length ?? 0) > 0 ? (
        <EventQuickCheckCitationSection
          citationHighlights={geo.citationHighlights}
          citationHighlightsByModel={geo.citationHighlightsByModel}
          ownDomain={geo.url ?? report.meta.url}
          knownCompetitors={geo.competitors.map((c) => c.name)}
        />
      ) : null}

      {geo.recommendations.length > 0 ? (
        <UiRecommendationList
          title={EQC_REPORT_COPY.sectionGeoRecommendations}
          items={geo.recommendations.map((r) => ({
            title: r.title,
            description: r.description,
          }))}
        />
      ) : null}
    </Stack>
  );
}

export function EventQuickCheckInsightsSection({ report }: SectionProps) {
  if (!report.insights) return null;
  const { insights } = report;
  const hasContent =
    insights.fazit || insights.findings.length > 0 || insights.recommendations.length > 0;
  if (!hasContent) return null;

  return (
    <Stack spacing={1.5}>
      {insights.fazit ? (
        <UiAlertBlock
          tone={insights.fazitTone ?? 'info'}
          title={EQC_REPORT_COPY.fazit}
          message={insights.fazit}
        />
      ) : null}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap: `${MSQDX_SPACING.scale.md}px`,
        }}
      >
        {insights.findings.length > 0 ? (
          <UiFindingList title={EQC_REPORT_COPY.sectionFindings} items={insights.findings} />
        ) : null}
        {insights.recommendations.length > 0 ? (
          <UiRecommendationList
            title={EQC_REPORT_COPY.sectionRecommendations}
            items={insights.recommendations}
          />
        ) : null}
      </Box>
    </Stack>
  );
}

export function EventQuickCheckAppendixSection({ report }: SectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <UiBlockSurface>
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
          <Box
            component="button"
            type="button"
            onClick={() => setOpen((v) => !v)}
            sx={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              p: 0,
              textAlign: 'left',
            }}
          >
            <Typography variant="subtitle2">{EQC_REPORT_COPY.sectionAppendix}</Typography>
          </Box>
          <InfoTooltip
            title={EQC_SECTION_HELP.appendix}
            placement="top"
            ariaLabel={eqcSectionHelpAriaLabel(EQC_REPORT_COPY.sectionAppendix)}
          />
        </Stack>
        <Box
          component="button"
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          sx={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            p: 0,
            flexShrink: 0,
          }}
        >
          <Typography variant="caption">{open ? '▾' : '▸'}</Typography>
        </Box>
      </Box>
      <Collapse in={open}>
        <Box sx={{ mt: 1 }}>
          <UiKeyValueList
            items={[
              ...(report.appendix.scanId ? [{ label: 'Scan-ID', value: report.appendix.scanId }] : []),
              ...(report.appendix.geoJobId ? [{ label: 'GEO Job-ID', value: report.appendix.geoJobId }] : []),
              ...(report.appendix.platformProjectId
                ? [{ label: 'Projekt', value: report.appendix.platformProjectId }]
                : []),
            ]}
          />
          <UiDataTable
            title={EQC_REPORT_COPY.appendixSteps}
            columns={report.appendix.stepTable.columns}
            rows={report.appendix.stepTable.rows}
          />
          {report.appendix.links.length > 0 ? (
            <UiLinkList title={EQC_REPORT_COPY.links} links={report.appendix.links} />
          ) : null}
        </Box>
      </Collapse>
    </UiBlockSurface>
  );
}

/** Linear one-pager layout (chat / pinned blocks). */
export function EventQuickCheckReportStack({ report }: SectionProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: `${MSQDX_SPACING.scale.md}px`,
      }}
    >
      <EventQuickCheckExecutiveHeader report={report} />
      <EventQuickCheckKpiSection report={report} />
      <Box>
        <ReportSectionHeader title={EQC_REPORT_COPY.sectionWorkflow} />
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
          {report.workflow.steps.map((s) => (
            <Chip
              key={s.id}
              size="small"
              label={`${s.label}: ${s.detail}`}
              color={stepStatusColor(s.status)}
              variant="outlined"
            />
          ))}
        </Stack>
      </Box>
      {report.domain ? (
        <Box>
          <ReportSectionHeader title={EQC_REPORT_COPY.sectionDomain} />
          <EventQuickCheckDomainSection report={report} />
        </Box>
      ) : null}
      {report.domainComparison?.rows.length ? (
        <Box>
          <ReportSectionHeader title={EQC_REPORT_COPY.sectionDomainComparison} />
          <EventQuickCheckDomainComparisonSection report={report} />
        </Box>
      ) : null}
      {report.persona || report.personas?.length ? (
        <Box>
          <ReportSectionHeader
            title={
              (report.personas?.length ?? 0) > 1
                ? EQC_REPORT_COPY.sectionPersonas
                : EQC_REPORT_COPY.sectionPersona
            }
          />
          <EventQuickCheckPersonaSection report={report} />
        </Box>
      ) : null}
      {report.market ? (
        <Box>
          <ReportSectionHeader title={EQC_REPORT_COPY.sectionMarket} />
          <EventQuickCheckMarketSection report={report} />
        </Box>
      ) : null}
      <Box>
        <ReportSectionHeader title={EQC_REPORT_COPY.sectionGeo} />
        <EventQuickCheckGeoSection report={report} />
      </Box>
      {report.insights ? (
        <Box>
          <ReportSectionHeader title={EQC_REPORT_COPY.sectionInsights} />
          <EventQuickCheckInsightsSection report={report} />
        </Box>
      ) : null}
      <EventQuickCheckAppendixSection report={report} />
    </Box>
  );
}
