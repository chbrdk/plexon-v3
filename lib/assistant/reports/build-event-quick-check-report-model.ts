import type { EventQuickCheckResult, EventQuickCheckStepOutcome } from '@/lib/assistant/playbooks/run-event-quick-check';
import {
  listPersonasFromPreview,
  resolvePersonaPreviewForReport,
} from '@/lib/assistant/event-quick-check/persona-bootstrap-preview';
import type { PersonaPreviewItem } from '@/lib/assistant/ui-blocks/build-persona-bootstrap-ui';
import { EVENT_QUICK_CHECK_ECHON_RESEARCH_ENABLED } from '@/lib/paths/assistant-workflows';
import type { WorkflowInsightNarrative } from '@/lib/assistant/insights/types';
import type { UiTone } from '@/lib/assistant/ui-blocks/types';
import { truncateReportText, asLabelList, humanizeTraitKey } from '@/lib/assistant/reports/format-report-text';
import {
  EVENT_QUICK_CHECK_REPORT_TEMPLATE_ID,
  type EventQuickCheckReportModel,
  type EventQuickCheckReportPersonaSection,
} from '@/lib/assistant/reports/event-quick-check-report-types';
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy';
import { buildEventQuickCheckDomainComparisonSection } from '@/lib/assistant/reports/map-event-quick-check-domain-comparison';
import { pathCheckionDomainScan, pathCheckionProject } from '@/lib/paths/checkion-api';
import { echonDashboardResearchUrl } from '@/lib/paths/echon-api';
import { pathPlatformProjectDashboard } from '@/lib/constants';

function mapPersonaToReportSection(
  p: PersonaPreviewItem,
  geoQuestions?: string[]
): EventQuickCheckReportPersonaSection {
  const rawTraits = p.profile?.traits ?? [];
  return {
    id: p.id,
    name: p.name,
    segment: p.segment,
    confidence: p.confidence,
    headline: p.headline,
    bio: p.profile?.bio,
    traits: rawTraits.map((t) => ({
      name: t.name,
      displayName:
        'displayName' in t && typeof (t as { displayName?: string }).displayName === 'string'
          ? (t as { displayName: string }).displayName
          : humanizeTraitKey(t.name),
      score: t.score,
    })),
    goals: asLabelList(p.profile?.goals).length
      ? asLabelList(p.profile?.goals)
      : (p.profile?.goals ?? []),
    painPoints: asLabelList(p.profile?.painPoints).length
      ? asLabelList(p.profile?.painPoints)
      : (p.profile?.painPoints ?? []),
    interests: p.profile?.interests ?? [],
    ...(geoQuestions?.length ? { geoQuestions } : {}),
  };
}

function scoreTone(value: number): UiTone {
  if (value >= 80) return 'success';
  if (value >= 60) return 'warning';
  return 'error';
}

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0] ?? url;
  }
}

function workflowStepDetail(o: EventQuickCheckStepOutcome): string {
  if (o.status === 'skipped') return o.skipReason ?? 'Übersprungen';
  if (o.status === 'error') return o.error ?? 'Fehler';
  if (o.stepId === 'geo_questions' && o.data?.questions) {
    const qs = o.data.questions as string[];
    return `${qs.length} Fragen`;
  }
  if (o.stepId === 'geo_check' && o.data?.job) {
    const job = o.data.job as { overallScore?: number | null };
    return job.overallScore != null ? `Score ${job.overallScore}` : 'OK';
  }
  if (o.stepId === 'domain_scan' && o.data?.scanId) {
    return 'Abgeschlossen';
  }
  if (o.stepId === 'persona_bootstrap' && o.data?.preview) {
    const p = o.data.preview as { persona?: { name?: string } };
    return p.persona?.name ?? 'Persona erstellt';
  }
  if (o.stepId === 'ensure_audion' && o.data?.audionProjectId) {
    return 'Verknüpft';
  }
  if (o.stepId === 'echon_market_research') {
    const count = o.data?.findingCount;
    if (typeof count === 'number') return `${count} Erkenntnisse`;
    if (o.data?.partial) return 'Timeout — Hintergrund';
    return 'Abgeschlossen';
  }
  if (o.data?.platformProjectId) return 'Angelegt';
  return '—';
}

function mapWorkflowStatus(
  status: EventQuickCheckStepOutcome['status']
): EventQuickCheckReportModel['workflow']['steps'][0]['status'] {
  if (status === 'done') return 'done';
  if (status === 'error') return 'error';
  return 'skipped';
}

export function buildEventQuickCheckReportModel(
  quick: EventQuickCheckResult,
  narrative?: WorkflowInsightNarrative
): EventQuickCheckReportModel {
  const domain = domainFromUrl(quick.url);
  const geoOutcome = quick.outcomes.find((o) => o.stepId === 'geo_check');
  const geoFailed = geoOutcome?.status === 'error';
  const geoPartial = Boolean(quick.geoJob) && geoFailed;
  const echonOutcome = quick.outcomes.find((o) => o.stepId === 'echon_market_research');
  const echon = quick.echonMarket;

  const personaPreview = resolvePersonaPreviewForReport({
    personaPreview: quick.personaPreview,
    outcomes: quick.outcomes,
    geoQuestionsByPersona: quick.geoQuestionsByPersona,
    projectName: quick.projectName,
  });
  const personaItemsForKpi = listPersonasFromPreview(personaPreview);

  const kpiTiles: EventQuickCheckReportModel['executive']['kpiTiles'] = [
    {
      label: 'Domain-Score',
      value: quick.domainScan?.score ?? '—',
      unit: quick.domainScan?.score != null ? '/100' : undefined,
      tone: quick.domainScan?.score != null ? scoreTone(quick.domainScan.score) : 'neutral',
    },
    {
      label: 'Seiten gescannt',
      value: quick.domainScan?.totalPages ?? '—',
      tone: 'neutral',
    },
    {
      label: 'A11y-Fehler',
      value: quick.domainScan?.stats.errors ?? '—',
      tone:
        quick.domainScan && quick.domainScan.stats.errors > 0 ? 'error' : 'success',
    },
    {
      label: 'Personas',
      value: personaItemsForKpi.length || '—',
      hint:
        personaItemsForKpi.length === 1
          ? personaItemsForKpi[0]?.name
          : personaItemsForKpi.map((p) => p.name).join(', ') || undefined,
      tone: personaItemsForKpi.length ? 'success' : 'warning',
    },
    {
      label: 'GEO-Score',
      value: quick.geoJob?.overallScore ?? '—',
      unit: quick.geoJob?.overallScore != null ? '/100' : undefined,
      tone:
        quick.geoJob?.overallScore != null ? scoreTone(quick.geoJob.overallScore) : 'neutral',
    },
    {
      label: 'GEO-Fragen',
      value: quick.geoQuestions?.length ?? 0,
      tone: 'neutral',
    },
    ...(echon?.available && echon.keyFindings?.length
      ? [
          {
            label: 'Markt-Signale',
            value: echon.keyFindings.length,
            tone: 'success' as UiTone,
          },
        ]
      : []),
  ];

  const workflowSteps = quick.outcomes.map((o) => ({
    id: o.stepId,
    label: o.label,
    status: mapWorkflowStatus(o.status),
    detail: workflowStepDetail(o),
  }));

  const links: EventQuickCheckReportModel['appendix']['links'] = [];
  if (quick.platformProjectId) {
    links.push({
      label: EQC_REPORT_COPY.linkDashboard,
      href: quick.dashboardPath ?? pathPlatformProjectDashboard(quick.platformProjectId),
    });
  }
  if (quick.domainScan) {
    links.push({
      label: EQC_REPORT_COPY.linkDeepScan,
      href: pathCheckionDomainScan({
        url: quick.domainScan.url || quick.url,
        scanId: quick.domainScan.id,
      }),
      external: true,
    });
  }
  const domainComparison = buildEventQuickCheckDomainComparisonSection(quick);
  if (domainComparison?.checkionProjectHref) {
    links.push({
      label: EQC_REPORT_COPY.linkCheckionProject,
      href: domainComparison.checkionProjectHref,
      external: true,
    });
  } else if (quick.checkionProjectId?.trim()) {
    links.push({
      label: EQC_REPORT_COPY.linkCheckionProject,
      href: pathCheckionProject(quick.checkionProjectId.trim()),
      external: true,
    });
  }
  if (echon?.threadId) {
    links.push({
      label: EQC_REPORT_COPY.linkEchonResearch,
      href: echonDashboardResearchUrl(echon.threadId),
      external: true,
    });
  }

  const appendixRows: EventQuickCheckReportModel['appendix']['stepTable']['rows'] =
    quick.outcomes.map((o) => [
      o.label,
      o.status === 'done' ? '✓' : o.status === 'skipped' ? '—' : '✗',
      workflowStepDetail(o),
    ]);

  const eeatDimensions = quick.geoJob?.eeatScores
    ? (
        [
          ['trust', EQC_REPORT_COPY.eeatTrust],
          ['experience', EQC_REPORT_COPY.eeatExperience],
          ['expertise', EQC_REPORT_COPY.eeatExpertise],
          ['authoritativeness', EQC_REPORT_COPY.eeatAuthoritativeness],
        ] as const
      )
        .map(([key, label]) => {
          const dim = quick.geoJob?.eeatScores?.[key];
          if (!dim) return null;
          return { key, label, score: dim.score, reasoning: dim.reasoning };
        })
        .filter((d): d is NonNullable<typeof d> => d != null)
    : [];

  const model: EventQuickCheckReportModel = {
    templateId: EVENT_QUICK_CHECK_REPORT_TEMPLATE_ID,
    meta: {
      title: `${quick.playbookLabel}: ${quick.projectName}`,
      url: quick.url,
      domain,
      projectName: quick.projectName,
      platformProjectId: quick.platformProjectId,
      generatedAt: new Date().toISOString(),
      playbookLabel: quick.playbookLabel,
      checkionOnly: quick.checkionOnly,
    },
    executive: {
      summary: narrative?.assessment,
      fazit: narrative?.fazit,
      fazitTone: narrative?.fazitTone,
      kpiTiles,
    },
    workflow: { steps: workflowSteps },
    geo: {
      status: geoFailed ? (geoPartial ? 'partial' : 'failed') : quick.geoJob ? 'complete' : 'skipped',
      errorMessage: geoOutcome?.error,
      questions: quick.geoQuestions ?? [],
      overallScore: quick.geoJob?.overallScore ?? null,
      geoFitnessScore: quick.geoJob?.geoFitnessScore ?? null,
      jobId: quick.geoJob?.jobId,
      url: quick.geoJob?.url ?? quick.url,
      competitors: (quick.geoJob?.competitors ?? []).map((c) => ({
        name: c.name,
        score: c.score,
        shareOfVoice: c.shareOfVoice,
        avgPosition: c.avgPosition,
        mentionCount: c.mentionCount,
      })),
      eeatDimensions,
      recommendations: (quick.geoJob?.recommendations ?? []).map((r) => ({
        title: r.title,
        description: r.description,
        priority: r.priority,
      })),
      citationHighlights: quick.geoJob?.citationHighlights ?? [],
      citationHighlightsByModel: quick.geoJob?.citationHighlightsByModel,
    },
    appendix: {
      scanId: quick.domainScan?.id,
      geoJobId: quick.geoJob?.jobId,
      platformProjectId: quick.platformProjectId,
      stepTable: {
        columns: ['Schritt', 'Status', 'Ergebnis'],
        rows: appendixRows,
      },
      links,
    },
  };

  if (quick.domainScan) {
    model.domain = {
      scanId: quick.domainScan.id,
      domain: quick.domainScan.domain,
      url: quick.domainScan.url || quick.url,
      status: quick.domainScan.status,
      score: quick.domainScan.score,
      totalPages: quick.domainScan.totalPages,
      stats: quick.domainScan.stats,
      topIssues: quick.domainScan.topIssues.slice(0, 5).map((i) => ({
        title: truncateReportText(i.title, 120),
        count: i.count,
      })),
      checkionHref: pathCheckionDomainScan({
        url: quick.domainScan.url || quick.url,
        scanId: quick.domainScan.id,
      }),
      seoPagesAnalyzed: quick.domainScan.seoPagesAnalyzed,
    };
  }

  if (domainComparison) {
    model.domainComparison = domainComparison;
  }

  const personaItems = listPersonasFromPreview(personaPreview);
  const questionsByPersonaId = new Map(
    (quick.geoQuestionsByPersona ?? []).map((g) => [g.personaId, g.questions] as const)
  );
  if (personaItems.length === 1) {
    model.persona = mapPersonaToReportSection(
      personaItems[0],
      questionsByPersonaId.get(personaItems[0].id) ?? quick.geoQuestions
    );
  } else if (personaItems.length > 1) {
    model.personas = personaItems.map((p) =>
      mapPersonaToReportSection(p, questionsByPersonaId.get(p.id))
    );
    model.persona = model.personas[0];
  }

  if (EVENT_QUICK_CHECK_ECHON_RESEARCH_ENABLED) {
    if (echonOutcome?.status === 'skipped') {
      model.market = {
        status: 'skipped',
        errorMessage: echonOutcome.skipReason ?? EQC_REPORT_COPY.marketSkipped,
        keyFindings: [],
      };
    } else if (echon?.available) {
      model.market = {
        status: 'complete',
        query: echon.query,
        threadId: echon.threadId,
        runId: echon.runId,
        executiveSummary: echon.executiveSummary,
        keyFindings: echon.keyFindings ?? [],
        implications: echon.implications,
        echonHref: echon.threadId ? echonDashboardResearchUrl(echon.threadId) : undefined,
      };
    } else if (echonOutcome?.status === 'done' && echonOutcome.data?.partial) {
      model.market = {
        status: 'partial',
        errorMessage: EQC_REPORT_COPY.marketPartial,
        query: echon?.query,
        threadId: echon?.threadId,
        runId: echon?.runId,
        keyFindings: echon?.keyFindings ?? [],
        implications: echon?.implications,
        echonHref: echon?.threadId ? echonDashboardResearchUrl(echon.threadId) : undefined,
      };
    } else if (echonOutcome?.status === 'error' || (echon && !echon.available)) {
      model.market = {
        status: 'failed',
        errorMessage: echonOutcome?.error ?? echon?.reason ?? EQC_REPORT_COPY.marketIncomplete,
        query: echon?.query,
        threadId: echon?.threadId,
        runId: echon?.runId,
        keyFindings: [],
        echonHref: echon?.threadId ? echonDashboardResearchUrl(echon.threadId) : undefined,
      };
    }
  }

  if (narrative && (narrative.findings.length > 0 || narrative.recommendations.length > 0 || narrative.fazit)) {
    model.insights = {
      assessment: narrative.assessment,
      fazit: narrative.fazit,
      fazitTone: narrative.fazitTone,
      findings: narrative.findings.map((f) => ({
        title: f.title,
        description: f.description,
        severity: f.severity ?? 'info',
      })),
      recommendations: narrative.recommendations.map((r) => ({
        title: r.title,
        description: r.description ?? '',
        priority: r.priority,
        category: r.category,
      })),
    };
  }

  return model;
}
