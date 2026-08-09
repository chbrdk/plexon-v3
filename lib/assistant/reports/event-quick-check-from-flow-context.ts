/**
 * Wave 23 — Magazine report from Collection Flow `lastRun.context`.
 * @see specs/domain/eqc-as-collection-flow.md
 */

import type { EventQuickCheckCompanyBrief } from '@/lib/assistant/event-quick-check/company-brief-types';
import type { EventQuickCheckResult } from '@/lib/assistant/playbooks/run-event-quick-check';
import type { DomainScanPreview } from '@/lib/integrations/checkion-domain-scan-client';
import type { GeoEeatJobPreview } from '@/lib/integrations/checkion-geo-client';
import type { PersonaBootstrapPreview } from '@/lib/assistant/ui-blocks/build-persona-bootstrap-ui';
import {
  geoQuestionsByPersonaFromCatalogBundle,
  personaPreviewFromCatalogBundle,
  preferRicherPersonaPreview,
} from '@/lib/assistant/event-quick-check/persona-bootstrap-preview';
import { EVENT_QUICK_CHECK_PLAYBOOK_ID } from '@/lib/paths/assistant-workflows';
import { QUICK_CHECK_LABEL } from '@/lib/assistant/event-quick-check/quick-check-label';
import type { CollectionFlowLastRun } from '@/lib/collection-test-flow';

function stringList(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.map((x) => String(x).trim()).filter(Boolean);
}

function briefFromOutputs(
  outputs: Record<string, Record<string, unknown>>
): EventQuickCheckCompanyBrief | undefined {
  const b = outputs.brief;
  if (!b || typeof b.displayName !== 'string') return undefined;
  return {
    displayName: String(b.displayName),
    industry: typeof b.industry === 'string' ? b.industry : '',
    summary: typeof b.summary === 'string' ? b.summary : '',
    targetAudienceHint: typeof b.targetAudienceHint === 'string' ? b.targetAudienceHint : '',
    disambiguationNote: typeof b.disambiguationNote === 'string' ? b.disambiguationNote : '',
    companyContext: typeof b.companyContext === 'string' ? b.companyContext : '',
    sources: { url: '', domain: '', h1: [] },
    generatedAt: typeof b.generatedAt === 'string' ? b.generatedAt : new Date().toISOString(),
  };
}

function domainFromOutputs(
  outputs: Record<string, Record<string, unknown>>,
  lastRun: CollectionFlowLastRun
): DomainScanPreview | undefined {
  const d = outputs.domain;
  if (!d && !lastRun.domainScanId) return undefined;
  const url = (typeof d?.url === 'string' ? d.url : lastRun.url) || '';
  let domain = '';
  try {
    domain = url ? new URL(url).hostname : '';
  } catch {
    domain = '';
  }
  const issues =
    d?.issues && typeof d.issues === 'object' ? (d.issues as Record<string, unknown>) : null;
  const items = Array.isArray(issues?.items) ? issues.items : [];
  const errors = Number(issues?.criticalCount ?? 0) + Number(issues?.seriousCount ?? 0);
  const issueCount = Number(issues?.issueCount ?? items.length ?? 0);
  const topIssues = items
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const o = row as Record<string, unknown>;
      const title = typeof o.title === 'string' ? o.title : typeof o.ruleId === 'string' ? o.ruleId : null;
      if (!title) return null;
      return { title, count: 1 };
    })
    .filter((x): x is { title: string; count: number } => Boolean(x))
    .slice(0, 10);
  const scanId =
    (typeof d?.scanId === 'string' && d.scanId) || lastRun.domainScanId || 'unknown';
  return {
    id: scanId,
    domain,
    url,
    status: typeof d?.status === 'string' ? d.status : 'completed',
    score:
      typeof d?.overallScore === 'number'
        ? d.overallScore
        : typeof lastRun.overallScore === 'number'
          ? lastRun.overallScore
          : 0,
    totalPages: typeof d?.pageCount === 'number' ? d.pageCount : 0,
    stats: {
      errors,
      warnings: 0,
      notices: 0,
      total: issueCount || errors,
    },
    topIssues,
  };
}

function geoFromOutputs(
  outputs: Record<string, Record<string, unknown>>,
  lastRun: CollectionFlowLastRun
): GeoEeatJobPreview | undefined {
  const g = outputs.geo;
  if (!g && !lastRun.geoJobId) return undefined;
  return {
    jobId: lastRun.geoJobId || 'unknown',
    url: typeof g?.url === 'string' ? g.url : lastRun.url || '',
    status: typeof g?.status === 'string' ? g.status : 'completed',
    overallScore: typeof g?.overallScore === 'number' ? g.overallScore : null,
    geoFitnessScore:
      typeof g?.geoFitness === 'number' ? g.geoFitness : lastRun.geoFitness ?? null,
  };
}

function personaFromOutputs(
  outputs: Record<string, Record<string, unknown>>
): PersonaBootstrapPreview | undefined {
  return personaPreviewFromCatalogBundle(outputs.persona);
}

/**
 * Build a minimal EventQuickCheckResult from Flow `lastRun.context` for the magazine report.
 */
export function eventQuickCheckResultFromFlowLastRun(input: {
  lastRun: CollectionFlowLastRun;
  projectName?: string;
  platformProjectId?: string;
  dashboardPath?: string;
  checkionProjectId?: string | null;
  audionProjectId?: string;
}): EventQuickCheckResult {
  const outputs = (input.lastRun.context?.outputs ?? {}) as Record<
    string,
    Record<string, unknown>
  >;
  const companyBrief = briefFromOutputs(outputs);
  const url =
    input.lastRun.url ||
    (typeof outputs.run?.url === 'string' ? outputs.run.url : '') ||
    '';
  const geoQuestions = stringList(outputs.queries?.items);

  return {
    ok: input.lastRun.status === 'complete' || input.lastRun.status === 'awaiting_input',
    playbookId: EVENT_QUICK_CHECK_PLAYBOOK_ID,
    playbookLabel: QUICK_CHECK_LABEL,
    projectName: companyBrief?.displayName || input.projectName || 'Quick Check',
    url,
    platformProjectId: input.platformProjectId,
    dashboardPath: input.dashboardPath,
    outcomes: [],
    steps: [],
    companyBrief,
    domainScan: domainFromOutputs(outputs, input.lastRun),
    geoJob: geoFromOutputs(outputs, input.lastRun),
    geoQuestions,
    geoQuestionsByPersona: geoQuestionsByPersonaFromCatalogBundle(outputs.persona),
    personaPreview: personaFromOutputs(outputs),
    checkionProjectId: input.checkionProjectId,
    audionProjectId: input.audionProjectId,
    eqcFlowState: {
      flowId: '',
      historyRunId: '',
      awaitingNodeId: input.lastRun.awaitingNodeId ?? null,
      context: input.lastRun.context
        ? {
            outputs: input.lastRun.context.outputs as Record<
              string,
              Record<string, unknown>
            >,
          }
        : undefined,
    },
  };
}

/** Fill missing scan/geo/brief fields on a playbook result from Flow context. */
export function mergeFlowContextIntoQuickResult(
  quick: EventQuickCheckResult
): EventQuickCheckResult {
  const ctx = quick.eqcFlowState?.context?.outputs;
  if (!ctx) return quick;
  const synthetic = eventQuickCheckResultFromFlowLastRun({
    lastRun: {
      startedAt: new Date().toISOString(),
      completedAt: null,
      scanId: null,
      url: quick.url,
      status: 'complete',
      overallScore: quick.domainScan?.score ?? null,
      domainScanId: quick.domainScan?.id ?? null,
      geoJobId: quick.geoJob?.jobId ?? null,
      context: { outputs: ctx },
    },
    projectName: quick.projectName,
    platformProjectId: quick.platformProjectId,
    dashboardPath: quick.dashboardPath,
    checkionProjectId: quick.checkionProjectId,
    audionProjectId: quick.audionProjectId,
  });
  return {
    ...quick,
    companyBrief: quick.companyBrief ?? synthetic.companyBrief,
    domainScan: quick.domainScan ?? synthetic.domainScan,
    geoJob: quick.geoJob ?? synthetic.geoJob,
    geoQuestions: quick.geoQuestions?.length ? quick.geoQuestions : synthetic.geoQuestions,
    geoQuestionsByPersona: quick.geoQuestionsByPersona?.length
      ? quick.geoQuestionsByPersona
      : synthetic.geoQuestionsByPersona,
    personaPreview: preferRicherPersonaPreview(quick.personaPreview, synthetic.personaPreview),
  };
}
