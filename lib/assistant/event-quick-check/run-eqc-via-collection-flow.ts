/**
 * Wave 23 — Event Quick Check playbook → Collection Flow executor (flag-gated).
 * @see specs/domain/eqc-as-collection-flow.md
 */

import type { RequestUser } from '@/lib/auth-request-user';
import { QUICK_CHECK_LABEL } from '@/lib/assistant/event-quick-check/quick-check-label';
import { bootstrapEqcCollection } from '@/lib/assistant/event-quick-check/bootstrap-eqc-collection';
import type { EventQuickCheckCompanyBrief } from '@/lib/assistant/event-quick-check/company-brief-types';
import {
  EVENT_QUICK_CHECK_INITIAL_STEPS,
  EVENT_QUICK_CHECK_STREAM_TITLE,
} from '@/lib/assistant/ui-blocks/event-quick-check-steps';
import {
  isEqcFlowRuntimeEnabled,
  executeEqcCollectionFlowRun,
} from '@/lib/collection-flow-eqc-execute';
import { ensureFlowDocument } from '@/lib/collection-test-flow';
import { createCollectionFlowRun, getCollectionFlowRun } from '@/lib/db/collection-flow-runs';
import { getCollectionTestFlow } from '@/lib/db/collection-test-flows';
import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import {
  patchWorkflowSteps,
} from '@/lib/assistant/workflows/workflow-step-stream';
import { emitPhase } from '@/lib/assistant/handlers/context';
import {
  EVENT_QUICK_CHECK_PLAYBOOK_ID,
  resolveEventQuickCheckProfile,
  type EventQuickCheckDepth,
} from '@/lib/paths/assistant-workflows';
import type {
  EventQuickCheckResult,
  EventQuickCheckRunMode,
  EventQuickCheckRunOptions,
  EventQuickCheckStepOutcome,
} from '@/lib/assistant/playbooks/run-event-quick-check';
import {
  buildEventQuickCheckCompetitorsCheckpoint,
  buildEventQuickCheckResumeCheckpoint,
} from '@/lib/assistant/event-quick-check/event-quick-check-checkpoint';
import type { DomainScanPreview } from '@/lib/integrations/checkion-domain-scan-client';
import type { GeoEeatJobPreview } from '@/lib/integrations/checkion-geo-client';
import type { PersonaBootstrapPreview } from '@/lib/assistant/ui-blocks/build-persona-bootstrap-ui';

const WORKFLOW_TYPE = 'event_quick_check';

export { isEqcFlowRuntimeEnabled };

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function briefFromContext(
  outputs: Record<string, Record<string, unknown>> | undefined
): EventQuickCheckCompanyBrief | undefined {
  const b = outputs?.brief;
  if (!b || typeof b.displayName !== 'string') return undefined;
  return {
    displayName: String(b.displayName),
    industry: typeof b.industry === 'string' ? b.industry : '',
    summary: typeof b.summary === 'string' ? b.summary : '',
    targetAudienceHint: typeof b.targetAudienceHint === 'string' ? b.targetAudienceHint : '',
    disambiguationNote: typeof b.disambiguationNote === 'string' ? b.disambiguationNote : '',
    companyContext: typeof b.companyContext === 'string' ? b.companyContext : '',
    sources: {
      url: '',
      domain: '',
      h1: [],
    },
    generatedAt: typeof b.generatedAt === 'string' ? b.generatedAt : new Date().toISOString(),
  };
}

function stringList(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.map((x) => String(x).trim()).filter(Boolean);
}

function domainScanFromContext(
  outputs: Record<string, Record<string, unknown>> | undefined,
  lastRun: { domainScanId?: string | null; url?: string | null; overallScore?: number | null }
): DomainScanPreview | undefined {
  const d = outputs?.domain;
  if (!d && !lastRun.domainScanId) return undefined;
  const url = (typeof d?.url === 'string' ? d.url : lastRun.url) || '';
  let domain = '';
  try {
    domain = url ? new URL(url).hostname : '';
  } catch {
    domain = '';
  }
  const score =
    typeof d?.overallScore === 'number'
      ? d.overallScore
      : typeof lastRun.overallScore === 'number'
        ? lastRun.overallScore
        : 0;
  return {
    id: lastRun.domainScanId || 'unknown',
    domain,
    url,
    status: typeof d?.status === 'string' ? d.status : 'completed',
    score,
    totalPages: typeof d?.pageCount === 'number' ? d.pageCount : 0,
    stats: { errors: 0, warnings: 0, notices: 0, total: 0 },
    topIssues: [],
  };
}

function geoJobFromContext(
  outputs: Record<string, Record<string, unknown>> | undefined,
  lastRun: { geoJobId?: string | null; citedShare?: number | null; geoFitness?: number | null }
): GeoEeatJobPreview | undefined {
  const g = outputs?.geo;
  if (!g && !lastRun.geoJobId) return undefined;
  return {
    jobId: lastRun.geoJobId || 'unknown',
    url: typeof g?.url === 'string' ? g.url : '',
    status: typeof g?.status === 'string' ? g.status : 'completed',
    overallScore: typeof g?.overallScore === 'number' ? g.overallScore : null,
    geoFitnessScore:
      typeof g?.geoFitness === 'number' ? g.geoFitness : lastRun.geoFitness ?? null,
  };
}

function personaPreviewFromContext(
  outputs: Record<string, Record<string, unknown>> | undefined
): PersonaBootstrapPreview | undefined {
  const p = outputs?.persona;
  if (!p || typeof p.name !== 'string' || !p.name.trim()) return undefined;
  return {
    projectId: typeof p.id === 'string' ? p.id : '',
    projectName: String(p.name),
    targetGroupId: '',
    targetGroupName: typeof p.segment === 'string' ? p.segment : '',
    persona: {
      id: typeof p.id === 'string' ? p.id : 'persona',
      name: String(p.name),
      segment: typeof p.segment === 'string' ? p.segment : '',
      confidence: 0.8,
      headline: String(p.name),
    },
  };
}

/** Map flow node progress onto legacy EQC step ids for ReviewGate/Progress. */
async function syncStepsFromFlow(input: {
  patchStep: (stepId: string, patch: Partial<WorkflowStep>) => Promise<WorkflowStep[]>;
  awaitingKind?: string | null;
  complete?: boolean;
  error?: string | null;
}): Promise<WorkflowStep[]> {
  const doneThrough: string[] = ['prepare', 'company_research'];
  if (input.awaitingKind === 'brief') {
    let steps = await input.patchStep('company_research', {
      status: 'done',
      detail: 'Profil erstellt',
    });
    steps = await input.patchStep('company_brief_confirm', {
      status: 'running',
      detail: 'Bitte Profil prüfen und bestätigen',
    });
    return steps;
  }
  doneThrough.push('company_brief_confirm', 'create_project', 'ensure_audion');
  if (input.awaitingKind === 'competitors') {
    let steps = await input.patchStep('competitors_suggest', {
      status: 'done',
      detail: 'Vorschläge bereit',
    });
    steps = await input.patchStep('competitors_confirm', {
      status: 'running',
      detail: 'Bitte Wettbewerber prüfen',
    });
    return steps;
  }
  doneThrough.push('competitors_suggest', 'competitors_confirm', 'domain_scan', 'persona_bootstrap');
  if (input.awaitingKind === 'geo_queries') {
    let steps = await input.patchStep('geo_questions', {
      status: 'done',
      detail: 'Fragen vorgeschlagen',
    });
    steps = await input.patchStep('geo_questions_confirm', {
      status: 'running',
      detail: 'Bitte GEO-Fragen prüfen',
    });
    return steps;
  }
  if (input.awaitingKind === 'deep_scan') {
    return input.patchStep('domain_scan', {
      status: 'running',
      detail: 'Deep Scan läuft…',
    });
  }
  if (input.complete) {
    let steps = await input.patchStep('geo_check', { status: 'done', detail: 'Abgeschlossen' });
    steps = await input.patchStep('aggregate', { status: 'done', detail: 'Report' });
    return steps;
  }
  if (input.error) {
    return input.patchStep('aggregate', { status: 'error', detail: input.error });
  }
  for (const id of doneThrough) {
    await input.patchStep(id, { status: 'done' });
  }
  return input.patchStep('prepare', { status: 'done' });
}

export type EqcFlowRuntimeState = {
  flowId: string;
  historyRunId: string;
  awaitingNodeId?: string | null;
  context?: { outputs: Record<string, Record<string, unknown>> };
};

/**
 * Run / resume EQC via Collection Flow. Caller must gate with `isEqcFlowRuntimeEnabled()`.
 */
export async function runEqcViaCollectionFlow(
  input: {
    user: RequestUser;
    projectName: string;
    url: string;
    platformProjectId?: string | null;
  },
  options: EventQuickCheckRunOptions & {
    /** Persisted from prior pause (workflow run result). */
    eqcFlowState?: EqcFlowRuntimeState | null;
  } = {}
): Promise<EventQuickCheckResult & { eqcFlowState?: EqcFlowRuntimeState }> {
  const runId = options.workflowRunId;
  const emit = options.emit;
  const runMode: EventQuickCheckRunMode = options.runMode ?? 'full_auto';
  const depth: EventQuickCheckDepth = options.depth ?? 'quick';
  const profile = resolveEventQuickCheckProfile(depth);
  let steps = options.initialSteps ?? [...EVENT_QUICK_CHECK_INITIAL_STEPS];
  const outcomes: EventQuickCheckStepOutcome[] = [];

  const patchStep = async (stepId: string, patch: Partial<WorkflowStep>) => {
    steps = await patchWorkflowSteps({
      runId,
      steps,
      stepId,
      patch,
      emit,
      workflowType: WORKFLOW_TYPE,
      title: EVENT_QUICK_CHECK_STREAM_TITLE,
    });
    return steps;
  };

  const url = normalizeUrl(input.url);
  let projectName = input.projectName.trim() || 'Quick Check';

  steps = await patchStep('prepare', { status: 'running' });
  emitPhase(emit, 'workflow', 'Quick Check Flow wird vorbereitet…');
  if (!url) {
    steps = await patchStep('prepare', { status: 'error', detail: 'URL fehlt' });
    return {
      ok: false,
      playbookId: EVENT_QUICK_CHECK_PLAYBOOK_ID,
      playbookLabel: QUICK_CHECK_LABEL,
      projectName,
      url: input.url,
      outcomes,
      steps,
      error: 'URL fehlt',
    };
  }
  steps = await patchStep('prepare', { status: 'done', detail: projectName });

  // Skip ECHON on flow path when the step exists in the run timeline
  if (steps.some((s) => s.id === 'echon_market_research')) {
    steps = await patchStep('echon_market_research', {
      status: 'done',
      detail: 'Out — Wave 23 Flow runtime',
    });
  }

  const boot = await bootstrapEqcCollection({
    user: input.user,
    projectName,
    url,
    platformProjectId: input.platformProjectId,
    depth,
  });
  if (!boot.ok || !boot.platformProjectId || !boot.flowId) {
    steps = await patchStep('create_project', {
      status: 'error',
      detail: boot.error ?? 'Bootstrap fehlgeschlagen',
    });
    return {
      ok: false,
      playbookId: EVENT_QUICK_CHECK_PLAYBOOK_ID,
      playbookLabel: QUICK_CHECK_LABEL,
      projectName,
      url,
      outcomes,
      steps,
      error: boot.error ?? 'Bootstrap fehlgeschlagen',
    };
  }

  steps = await patchStep('create_project', {
    status: 'done',
    detail: boot.platformProjectId,
  });
  steps = await patchStep('ensure_audion', {
    status: boot.audionProjectId || boot.checkionProjectId ? 'done' : 'error',
    detail: [boot.audionProjectId, boot.checkionProjectId].filter(Boolean).join(' · ') || 'fehlt',
  });

  const flowRow = await getCollectionTestFlow(boot.platformProjectId, boot.flowId);
  if (!flowRow) {
    return {
      ok: false,
      playbookId: EVENT_QUICK_CHECK_PLAYBOOK_ID,
      playbookLabel: QUICK_CHECK_LABEL,
      projectName,
      url,
      platformProjectId: boot.platformProjectId,
      outcomes,
      steps,
      error: 'Flow-Dokument fehlt',
    };
  }
  const doc = ensureFlowDocument(flowRow.flow);

  let historyRunId = options.eqcFlowState?.historyRunId ?? null;
  if (historyRunId) {
    const existing = await getCollectionFlowRun(
      boot.platformProjectId,
      boot.flowId,
      historyRunId
    );
    if (!existing) historyRunId = null;
  }
  if (!historyRunId) {
    const created = await createCollectionFlowRun({
      flowId: boot.flowId,
      platformProjectId: boot.platformProjectId,
      trigger: 'ui',
      status: 'running',
      request: { url, depth, source: 'event-quick-check' },
    });
    historyRunId = created.id;
  }

  const body: Record<string, unknown> = {
    url,
    depth,
    projectName: options.companyBrief?.displayName?.trim() || projectName,
    historyRunId,
  };

  const resumeFrom = options.eqcFlowState?.awaitingNodeId ?? null;

  if (runMode === 'continue_after_brief' && options.companyBrief) {
    body.resume = true;
    body.resumeFromNodeId = resumeFrom || 'n-confirm-brief';
    body.confirmKind = 'brief';
    body.payload = options.companyBrief;
    body.priorContext = options.eqcFlowState?.context ?? { outputs: {} };
    projectName = options.companyBrief.displayName.trim() || projectName;
  } else if (runMode === 'continue_after_competitors' && options.competitorsConfirmed) {
    body.resume = true;
    body.resumeFromNodeId = resumeFrom || 'n-confirm-competitors';
    body.confirmKind = 'competitors';
    body.payload = options.competitorsConfirmed;
    body.priorContext = options.eqcFlowState?.context ?? { outputs: {} };
  } else if (runMode === 'after_geo' && options.geoQuestions?.length) {
    body.resume = true;
    body.resumeFromNodeId = resumeFrom || 'n-confirm-geo';
    body.confirmKind = 'geo_queries';
    body.payload = options.geoQuestions;
    body.priorContext = options.eqcFlowState?.context ?? { outputs: {} };
  }

  // Load prior context from history run when resuming
  if (body.resume === true) {
    const hist = await getCollectionFlowRun(boot.platformProjectId, boot.flowId, historyRunId);
    const ctx = (hist?.lastRun as { context?: { outputs: Record<string, Record<string, unknown>> } } | null)
      ?.context;
    if (ctx && !options.eqcFlowState?.context) body.priorContext = ctx;
    const awaiting = (hist?.lastRun as { awaitingNodeId?: string } | null)?.awaitingNodeId;
    if (awaiting && (!body.resumeFromNodeId || body.resumeFromNodeId === resumeFrom)) {
      body.resumeFromNodeId = awaiting;
    }
  } else if (options.eqcFlowState?.context) {
    body.priorContext = options.eqcFlowState.context;
  }

  emitPhase(emit, 'workflow', 'Collection Flow läuft…');
  const result = await executeEqcCollectionFlowRun({
    platformProjectId: boot.platformProjectId,
    flowId: boot.flowId,
    flowName: flowRow.name,
    doc,
    body,
    historyRunId,
  });

  if (!result.ok) {
    steps = await patchStep('aggregate', { status: 'error', detail: result.message });
    return {
      ok: false,
      playbookId: EVENT_QUICK_CHECK_PLAYBOOK_ID,
      playbookLabel: QUICK_CHECK_LABEL,
      projectName,
      url,
      platformProjectId: boot.platformProjectId,
      outcomes,
      steps,
      error: result.message,
      eqcFlowState: {
        flowId: boot.flowId,
        historyRunId,
        context: undefined,
      },
    };
  }

  const outputs = result.lastRun.context?.outputs ?? {};
  const companyBrief = briefFromContext(outputs) ?? options.companyBrief;
  const competitors = stringList(outputs.competitors?.items);
  const geoQuestions = stringList(outputs.queries?.items);
  const domainScan = domainScanFromContext(outputs, result.lastRun);
  const geoJob = geoJobFromContext(outputs, result.lastRun);
  const personaPreview = personaPreviewFromContext(outputs);

  const eqcFlowState: EqcFlowRuntimeState = {
    flowId: boot.flowId,
    historyRunId,
    awaitingNodeId: result.lastRun.awaitingNodeId ?? null,
    context: result.lastRun.context
      ? { outputs: result.lastRun.context.outputs as Record<string, Record<string, unknown>> }
      : undefined,
  };

  if (result.lastRun.status === 'awaiting_input') {
    const kind = result.lastRun.awaitingConfirmKind;
    steps = await syncStepsFromFlow({ patchStep, awaitingKind: kind });

    if (kind === 'brief' && companyBrief) {
      outcomes.push({
        stepId: 'company_research',
        label: 'Unternehmen recherchieren',
        status: 'done',
        data: { displayName: companyBrief.displayName, industry: companyBrief.industry },
      });
      return {
        ok: true,
        playbookId: EVENT_QUICK_CHECK_PLAYBOOK_ID,
        playbookLabel: QUICK_CHECK_LABEL,
        projectName: companyBrief.displayName || projectName,
        url,
        platformProjectId: boot.platformProjectId,
        dashboardPath: boot.dashboardPath,
        outcomes,
        steps,
        companyBrief,
        awaitingCompanyBriefConfirmation: true,
        checkionProjectId: boot.checkionProjectId,
        audionProjectId: boot.audionProjectId,
        audionSetupRequired: boot.audionSetupRequired,
        eqcFlowState,
      };
    }

    if (kind === 'competitors') {
      const competitorsCheckpoint = buildEventQuickCheckCompetitorsCheckpoint({
        projectName,
        url,
        platformProjectId: boot.platformProjectId,
        dashboardPath: boot.dashboardPath,
        checkionProjectId: boot.checkionProjectId || '',
        audionProjectId: boot.audionProjectId,
        audionSetupRequired: Boolean(boot.audionSetupRequired),
        companyBrief: companyBrief!,
        outcomes,
        depth,
      });
      return {
        ok: true,
        playbookId: EVENT_QUICK_CHECK_PLAYBOOK_ID,
        playbookLabel: QUICK_CHECK_LABEL,
        projectName,
        url,
        platformProjectId: boot.platformProjectId,
        dashboardPath: boot.dashboardPath,
        outcomes,
        steps,
        companyBrief,
        awaitingCompetitorsConfirmation: true,
        competitorsDraft: competitors,
        competitorsCheckpoint,
        checkionProjectId: boot.checkionProjectId,
        audionProjectId: boot.audionProjectId,
        eqcFlowState,
      };
    }

    if (kind === 'geo_queries') {
      const resumeCheckpoint = buildEventQuickCheckResumeCheckpoint({
        projectName,
        url,
        platformProjectId: boot.platformProjectId,
        dashboardPath: boot.dashboardPath,
        audionProjectId: boot.audionProjectId,
        checkionProjectId: boot.checkionProjectId ?? undefined,
        audionSetupRequired: boot.audionSetupRequired,
        outcomes,
        steps,
        companyBrief,
        personaPreview,
        domainScan,
        geoCompetitors: competitors.length ? competitors : options.geoCompetitors ?? [],
      });
      return {
        ok: true,
        playbookId: EVENT_QUICK_CHECK_PLAYBOOK_ID,
        playbookLabel: QUICK_CHECK_LABEL,
        projectName,
        url,
        platformProjectId: boot.platformProjectId,
        dashboardPath: boot.dashboardPath,
        outcomes,
        steps,
        companyBrief,
        personaPreview,
        domainScan,
        geoQuestions,
        geoCompetitors: resumeCheckpoint.geoCompetitors,
        awaitingGeoQuestionsConfirmation: true,
        resumeCheckpoint,
        checkionProjectId: boot.checkionProjectId,
        audionProjectId: boot.audionProjectId,
        eqcFlowState,
      };
    }
  }

  if (result.verdict.status === 'error' || result.lastRun.status === 'error') {
    const err = result.lastRun.error || result.verdict.summary || 'Flow fehlgeschlagen';
    steps = await syncStepsFromFlow({ patchStep, error: err });
    return {
      ok: false,
      playbookId: EVENT_QUICK_CHECK_PLAYBOOK_ID,
      playbookLabel: QUICK_CHECK_LABEL,
      projectName,
      url,
      platformProjectId: boot.platformProjectId,
      outcomes,
      steps,
      companyBrief,
      domainScan,
      personaPreview,
      error: err,
      eqcFlowState,
    };
  }

  steps = await syncStepsFromFlow({ patchStep, complete: true });
  outcomes.push(
    {
      stepId: 'domain_scan',
      label: 'Domain-Scan',
      status: 'done',
      data: { scanId: result.lastRun.domainScanId },
    },
    {
      stepId: 'persona_bootstrap',
      label: 'Persona',
      status: 'done',
      data: { preview: personaPreview },
    },
    {
      stepId: 'geo_check',
      label: 'GEO',
      status: 'done',
      data: { job: geoJob },
    },
    {
      stepId: 'aggregate',
      label: 'Report',
      status: 'done',
    }
  );

  void profile;
  return {
    ok: true,
    playbookId: EVENT_QUICK_CHECK_PLAYBOOK_ID,
    playbookLabel: QUICK_CHECK_LABEL,
    projectName,
    url,
    platformProjectId: boot.platformProjectId,
    dashboardPath: boot.dashboardPath,
    outcomes,
    steps,
    companyBrief,
    domainScan,
    geoJob,
    geoQuestions,
    personaPreview,
    checkionProjectId: boot.checkionProjectId,
    audionProjectId: boot.audionProjectId,
    audionSetupRequired: boot.audionSetupRequired,
    eqcFlowState,
  };
}
