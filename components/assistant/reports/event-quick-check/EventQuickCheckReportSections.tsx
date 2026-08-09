'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Chip, Text } from '@msqdx/ui';
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
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy';
import { EventQuickCheckGeoCharts } from '@/components/event-quick-check/EventQuickCheckGeoCharts';
import { EventQuickCheckCitationSection } from '@/components/event-quick-check/EventQuickCheckCitationSection';
import { formatReportGeneratedAt } from '@/lib/assistant/reports/format-report-text';
import {
  EQC_SECTION_HELP,
  eqcSectionHelpAriaLabel,
} from '@/lib/assistant/event-quick-check/event-quick-check-section-help';

/** Status tone suffix for `plexon-eqc-status--*` / `data-tone`. */
export function stepStatusColor(status: string): 'success' | 'error' | 'default' | 'warning' {
  if (status === 'done') return 'success';
  if (status === 'error') return 'error';
  if (status === 'skipped') return 'warning';
  return 'default';
}

function TraitBars({ traits }: { traits: EventQuickCheckReportPersonaTrait[] }) {
  if (!traits || !Array.isArray(traits) || traits.length === 0) return null;
  return (
    <div className="plexon-eqc-stack-sm plexon-eqc-trait-list">
      {traits.map((t) => {
        const pct = Math.round(t.score <= 1 ? t.score * 100 : t.score);
        const width = Math.min(100, pct);
        return (
          <div key={t.name} className="plexon-eqc-trait">
            <div className="plexon-eqc-row-between">
              <Text role="hint">{t.displayName}</Text>
              <Text role="hint">{pct}%</Text>
            </div>
            <div
              className="plexon-eqc-trait-bar"
              role="progressbar"
              aria-valuenow={width}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t.displayName}
            >
              <div className="plexon-eqc-trait-bar-fill" style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
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
    <div className="plexon-eqc-stack plexon-report-exec">
      {!hideTitle ? (
        <Text role="title" as="h2" className="plexon-report-exec-title">
          {report.meta.title}
        </Text>
      ) : null}
      <div className="plexon-eqc-chip-row">
        <Chip static size="sm">
          {report.meta.domain}
        </Chip>
        <Chip static size="sm">
          {report.meta.projectName}
        </Chip>
        {generatedAtLabel ? (
          <Chip static size="sm">
            {generatedAtLabel}
          </Chip>
        ) : null}
      </div>
      {report.meta.url ? <Text role="body">{report.meta.url}</Text> : null}
      {report.executive.summary ? <Text role="body">{report.executive.summary}</Text> : null}
      {report.executive.fazit ? (
        <UiAlertBlock
          tone={report.executive.fazitTone ?? 'info'}
          title={EQC_REPORT_COPY.fazit}
          message={report.executive.fazit}
        />
      ) : null}
    </div>
  );
}

function KpiTileGrid({ report }: SectionProps) {
  return (
    <div className="plexon-eqc-kpi-grid">
      {report.executive.kpiTiles.map((item) => (
        <UiMetricTile key={`${item.label}-${item.value}`} item={item} />
      ))}
    </div>
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
    <div className="plexon-eqc-stack-sm">
      {report.workflow.steps.map((s) => {
        const tone = stepStatusColor(s.status);
        return (
          <div key={s.id} className="plexon-eqc-workflow-row">
            <div className="plexon-eqc-workflow-copy">
              <Text role="label">{s.label}</Text>
              <Text role="hint">{s.detail}</Text>
            </div>
            <Chip static size="sm" className={`plexon-eqc-status--${tone}`}>
              {s.status}
            </Chip>
          </div>
        );
      })}
    </div>
  );
}

export function EventQuickCheckDomainSection({ report }: SectionProps) {
  if (!report.domain) return null;
  return (
    <div className="plexon-eqc-stack">
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
    </div>
  );
}

export function EventQuickCheckDomainComparisonSection({ report }: SectionProps) {
  const comparison = report.domainComparison;
  if (!comparison?.rows.length) return null;

  return (
    <div className="plexon-eqc-stack">
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
        <Text role="hint">
          {EQC_REPORT_COPY.domainComparisonFailed}: {comparison.failedDomains.join(' · ')}
        </Text>
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
    </div>
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
    <div className="plexon-eqc-stack">
      {personas.length > 1 ? (
        <div className="plexon-eqc-chip-row">
          <Chip static size="sm">
            {EQC_REPORT_COPY.personaSwitcherLabel}
          </Chip>
          {personas.map((p) => {
            const selected = p.id === persona.id;
            return (
              <Chip
                key={p.id}
                size="sm"
                selected={selected}
                title={p.segment}
                onClick={() => setActivePersonaId(p.id)}
              >
                {p.name}
              </Chip>
            );
          })}
        </div>
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
      {persona.bio && persona.bio !== persona.headline ? (
        <Text role="body">{persona.bio}</Text>
      ) : null}
      {persona.traits.length > 0 ? (
        <div className="plexon-eqc-stack-sm">
          <Text role="meta" as="h4">
            {EQC_REPORT_COPY.sectionPersonaTraits}
          </Text>
          <TraitBars traits={persona.traits} />
        </div>
      ) : null}
      {geoQuestions.length > 0 ? (
        <UiRecommendationList
          title={EQC_REPORT_COPY.sectionGeoQuestions}
          items={geoQuestions.map((q, i) => ({ title: `${i + 1}. ${q}` }))}
        />
      ) : null}
      <div className="plexon-eqc-split-grid">
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
      </div>
      {persona.interests.length > 0 ? (
        <UiRecommendationList
          title={EQC_REPORT_COPY.sectionInterests}
          items={persona.interests.map((interest, i) => ({
            title: `${i + 1}. ${interest}`,
          }))}
        />
      ) : null}
    </div>
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
    <div className="plexon-eqc-stack">
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
      {market.executiveSummary ? <Text role="body">{market.executiveSummary}</Text> : null}
      {market.keyFindings.length > 0 ? (
        <UiRecommendationList
          title={EQC_REPORT_COPY.sectionMarketFindings}
          items={market.keyFindings.map((finding, i) => ({
            title: `${i + 1}. ${finding}`,
          }))}
        />
      ) : null}
      {market.implications ? <Text role="body">{market.implications}</Text> : null}
      {market.echonHref ? (
        <UiLinkList
          links={[{ label: EQC_REPORT_COPY.linkEchonResearch, href: market.echonHref, external: true }]}
        />
      ) : null}
    </div>
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
    <div className="plexon-eqc-stack">
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
    </div>
  );
}

export function EventQuickCheckInsightsSection({ report }: SectionProps) {
  if (!report.insights) return null;
  const { insights } = report;
  const hasContent =
    insights.fazit || insights.findings.length > 0 || insights.recommendations.length > 0;
  if (!hasContent) return null;

  return (
    <div className="plexon-eqc-stack">
      {insights.fazit ? (
        <UiAlertBlock
          tone={insights.fazitTone ?? 'info'}
          title={EQC_REPORT_COPY.fazit}
          message={insights.fazit}
        />
      ) : null}
      <div className="plexon-eqc-split-grid plexon-eqc-split-grid--lg">
        {insights.findings.length > 0 ? (
          <UiFindingList title={EQC_REPORT_COPY.sectionFindings} items={insights.findings} />
        ) : null}
        {insights.recommendations.length > 0 ? (
          <UiRecommendationList
            title={EQC_REPORT_COPY.sectionRecommendations}
            items={insights.recommendations}
          />
        ) : null}
      </div>
    </div>
  );
}

export function EventQuickCheckAppendixSection({
  report,
  bare = false,
}: SectionProps & { bare?: boolean }) {
  const [open, setOpen] = useState(bare);

  const body = (
    <div className="plexon-eqc-stack plexon-eqc-appendix-body">
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
    </div>
  );

  if (bare) {
    return body;
  }

  return (
    <div className="plexon-eqc-appendix">
      <div className="plexon-eqc-appendix-head">
        <div className="plexon-eqc-row">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="plexon-eqc-appendix-toggle"
            onClick={() => setOpen((v) => !v)}
          >
            <Text role="label">{EQC_REPORT_COPY.sectionAppendix}</Text>
          </Button>
          <span
            className="plexon-eqc-help"
            title={EQC_SECTION_HELP.appendix}
            aria-label={eqcSectionHelpAriaLabel(EQC_REPORT_COPY.sectionAppendix)}
          >
            i
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={open}
          className="plexon-eqc-appendix-chevron"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '▾' : '▸'}
        </Button>
      </div>
      {open ? body : null}
    </div>
  );
}

/** Linear one-pager layout (chat / pinned blocks). */
export function EventQuickCheckReportStack({ report }: SectionProps) {
  return (
    <div className="plexon-report-stack">
      <EventQuickCheckExecutiveHeader report={report} />
      <EventQuickCheckKpiSection report={report} />
      <div className="plexon-report-section">
        <ReportSectionHeader title={EQC_REPORT_COPY.sectionWorkflow} />
        <div className="plexon-eqc-chip-row">
          {report.workflow.steps.map((s) => {
            const tone = stepStatusColor(s.status);
            return (
              <Chip key={s.id} static size="sm" className={`plexon-eqc-status--${tone}`}>
                {`${s.label}: ${s.detail}`}
              </Chip>
            );
          })}
        </div>
      </div>
      {report.domain ? (
        <div className="plexon-report-section">
          <ReportSectionHeader title={EQC_REPORT_COPY.sectionDomain} />
          <EventQuickCheckDomainSection report={report} />
        </div>
      ) : null}
      {report.domainComparison?.rows.length ? (
        <div className="plexon-report-section">
          <ReportSectionHeader title={EQC_REPORT_COPY.sectionDomainComparison} />
          <EventQuickCheckDomainComparisonSection report={report} />
        </div>
      ) : null}
      {report.persona || report.personas?.length ? (
        <div className="plexon-report-section">
          <ReportSectionHeader
            title={
              (report.personas?.length ?? 0) > 1
                ? EQC_REPORT_COPY.sectionPersonas
                : EQC_REPORT_COPY.sectionPersona
            }
          />
          <EventQuickCheckPersonaSection report={report} />
        </div>
      ) : null}
      {report.market ? (
        <div className="plexon-report-section">
          <ReportSectionHeader title={EQC_REPORT_COPY.sectionMarket} />
          <EventQuickCheckMarketSection report={report} />
        </div>
      ) : null}
      <div className="plexon-report-section">
        <ReportSectionHeader title={EQC_REPORT_COPY.sectionGeo} />
        <EventQuickCheckGeoSection report={report} />
      </div>
      {report.insights ? (
        <div className="plexon-report-section">
          <ReportSectionHeader title={EQC_REPORT_COPY.sectionInsights} />
          <EventQuickCheckInsightsSection report={report} />
        </div>
      ) : null}
      <EventQuickCheckAppendixSection report={report} />
    </div>
  );
}
