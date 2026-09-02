import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import type { RequestUser } from '@/lib/auth-request-user';
import { QUICK_CHECK_LABEL } from '@/lib/assistant/event-quick-check/quick-check-label';
import { emitPhase } from '@/lib/assistant/handlers/context';
import type { PersonaGeoQuestionGroup } from '@/lib/assistant/geo/build-persona-geo-questions';
import {
  PERSONA_REQUIRED_ERROR,
  personaBootstrapDetailLabel,
  runPersonaAndGeoQuestionsStep,
} from '@/lib/assistant/event-quick-check/run-persona-and-geo-step';
import { listPersonasFromPreview } from '@/lib/assistant/event-quick-check/persona-bootstrap-preview';
import type { PlaybookStepPayload } from '@/lib/assistant/playbooks/execute-step';
import {
  EVENT_QUICK_CHECK_INITIAL_STEPS,
  EVENT_QUICK_CHECK_STREAM_TITLE,
} from '@/lib/assistant/ui-blocks/event-quick-check-steps';
import { ensureBindingPlaceholders, upsertPlatformProjectBinding } from '@/lib/db/platform-project-bindings';
import { PLATFORM_PROJECT_BINDING_SYNC_STATUS } from '@/lib/platform-companies';
import {
  createPlatformProjectWorkflow,
  getProjectBindingIds,
} from '@/lib/assistant/workflows/create-platform-project';
import { ensurePlatformProductBindings } from '@/lib/assistant/workflows/ensure-platform-product-bindings';
import { provisionAudionDirect } from '@/lib/assistant/workflows/provision-audion-direct';
import { runDomainScanWorkflow } from '@/lib/assistant/workflows/domain-scan';
import { runGeoAnalysisWorkflow } from '@/lib/assistant/workflows/geo-analysis';
import { startCheckionProjectResearch } from '@/lib/integrations/checkion-research-client';
import {
  fetchAudionProjectResearchLatest,
  pollAudionProjectResearch,
  startAudionProjectResearch,
} from '@/lib/integrations/audion-research-client';
import { suggestCheckionProjectCompetitors } from '@/lib/integrations/checkion-project-competitors-client';
import {
  EVENT_QUICK_CHECK_BINDING_SOURCE,
  EVENT_QUICK_CHECK_ECHON_RESEARCH_ENABLED,
  EVENT_QUICK_CHECK_PLAYBOOK_ID,
  EVENT_QUICK_CHECK_RESEARCH_MAX_MS,
  resolveEventQuickCheckProfile,
  type EventQuickCheckDepth,
  type EventQuickCheckProfile,
  type EventQuickCheckProfileOverrides,
} from '@/lib/paths/assistant-workflows';
import { pathPlatformProjectDashboard } from '@/lib/constants';
import type { PersonaBootstrapPreview } from '@/lib/assistant/ui-blocks/build-persona-bootstrap-ui';
import type { GeoEeatJobPreview } from '@/lib/integrations/checkion-geo-client';
import { parseGeoMeasurementsOrDefaultEqc, type GeoMeasurement } from '@/lib/geo/measurement';
import type { DomainScanPreview } from '@/lib/integrations/checkion-domain-scan-client';
import {
  patchWorkflowSteps,
  type WorkflowStepEmitter,
} from '@/lib/assistant/workflows/workflow-step-stream';
import {
  finalizeEchonQuickCheckResearch,
  echonQuickCheckMissingEnvMessage,
  isEchonQuickCheckResearchEnabled,
  startEchonQuickCheckResearch,
  type EchonQuickCheckResearchHandle,
} from '@/lib/assistant/event-quick-check/echon-quick-check-research';
import type { EchonMarketContext } from '@/lib/integrations/echon-market-context';
import type { EventQuickCheckCompanyBrief } from '@/lib/assistant/event-quick-check/company-brief-types';
import { researchCompanyBrief } from '@/lib/assistant/event-quick-check/research-company-brief';
import {
  isEqcFlowRuntimeEnabled,
  runEqcViaCollectionFlow,
} from '@/lib/assistant/event-quick-check/run-eqc-via-collection-flow';
import type {
  EventQuickCheckResumeCheckpoint,
  EventQuickCheckCompetitorsCheckpoint,
} from '@/lib/assistant/event-quick-check/event-quick-check-checkpoint';
import {
  buildEventQuickCheckCompetitorsCheckpoint,
  buildEventQuickCheckResumeCheckpoint,
} from '@/lib/assistant/event-quick-check/event-quick-check-checkpoint';
import {
  mergeDeepScanIntoOutcomes,
  resolveDeepScanForQuickCheck,
} from '@/lib/assistant/event-quick-check/resolve-deep-scan-for-quick-check';
import {
  startCheckionProjectDomainScanAll,
  type CheckionProjectDeepScanStarted,
} from '@/lib/integrations/checkion-project-deep-scan-client';

const RESEARCH_POLL_MS = 3000;
const WORKFLOW_TYPE = 'event_quick_check';

export type EventQuickCheckRunMode =
  | 'company_research_only'
  | 'continue_after_brief'
  | 'continue_after_competitors'
  | 'after_geo'
  | 'full_auto';

export type EventQuickCheckStepOutcome = {
  stepId: string;
  label: string;
  status: 'done' | 'error' | 'skipped';
  error?: string;
  skipReason?: string;
  payload?: PlaybookStepPayload;
  data?: Record<string, unknown>;
};

export type EventQuickCheckResult = {
  ok: boolean;
  playbookId: typeof EVENT_QUICK_CHECK_PLAYBOOK_ID;
  playbookLabel: string;
  projectName: string;
  url: string;
  platformProjectId?: string;
  outcomes: EventQuickCheckStepOutcome[];
  steps: WorkflowStep[];
  dashboardPath?: string;
  geoQuestions?: string[];
  geoQuestionsByPersona?: PersonaGeoQuestionGroup[];
  geoJob?: GeoEeatJobPreview;
  geoJobs?: Array<{ measurement: GeoMeasurement; job: GeoEeatJobPreview }>;
  domainScan?: DomainScanPreview;
  personaPreview?: PersonaBootstrapPreview;
  audionProjectId?: string;
  audionSetupRequired?: boolean;
  checkionOnly?: boolean;
  echonMarket?: EchonMarketContext & { runId?: string; query?: string };
  companyBrief?: EventQuickCheckCompanyBrief;
  awaitingCompanyBriefConfirmation?: boolean;
  awaitingGeoQuestionsConfirmation?: boolean;
  awaitingCompetitorsConfirmation?: boolean;
  competitorsDraft?: string[];
  competitorsCheckpoint?: EventQuickCheckCompetitorsCheckpoint;
  resumeCheckpoint?: EventQuickCheckResumeCheckpoint;
  geoCompetitors?: string[];
  checkionProjectId?: string | null;
  awaitingDeepScanConfirmation?: boolean;
  deepScanProgress?: { complete: number; total: number; detail: string };
  error?: string;
  /** Wave 23 — Collection Flow pause/resume handles. */
  eqcFlowState?: {
    flowId: string;
    historyRunId: string;
    awaitingNodeId?: string | null;
    context?: { outputs: Record<string, Record<string, unknown>> };
  };
};

export type EventQuickCheckRunOptions = {
  workflowRunId?: string;
  initialSteps?: WorkflowStep[];
  emit?: WorkflowStepEmitter;
  companyBrief?: EventQuickCheckCompanyBrief;
  geoQuestions?: string[];
  geoMeasurements?: GeoMeasurement[];
  geoCompetitors?: string[];
  geoQuestionsByPersona?: PersonaGeoQuestionGroup[];
  resumeCheckpoint?: EventQuickCheckResumeCheckpoint;
  runMode?: EventQuickCheckRunMode;
  depth?: EventQuickCheckDepth;
  /** Per-run count overrides (personaCount / maxCompetitors). */
  profileOverrides?: EventQuickCheckProfileOverrides;
  competitorsConfirmed?: string[];
  competitorsCheckpoint?: EventQuickCheckCompetitorsCheckpoint;
  /** Wave 23 — prior Flow pause state for resume. */
  eqcFlowState?: EventQuickCheckResult['eqcFlowState'];
  /** Adopt existing CHECKION domain scan (reconcile / resume). */
  preferDomainScanId?: string;
  onDomainScanStarted?: (scan: { id: string; status: string; url?: string }) => void | Promise<void>;
};

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function domainFromUrl(url: string): string | undefined {
  try {
    return new URL(normalizeUrl(url)).hostname;
  } catch {
    return undefined;
  }
}

function streamPhase(emit: WorkflowStepEmitter | undefined, detail: string): void {
  emitPhase(emit, 'workflow', detail);
}

async function runGeoLayersForQuickCheck(input: {
  url: string
  checkionProjectId?: string | null
  queries?: string[]
  competitors?: string[]
  measurements?: GeoMeasurement[]
  patchStep: (stepId: string, patch: Partial<WorkflowStep>) => Promise<WorkflowStep[]>
  emit?: WorkflowStepEmitter
}): Promise<{
  ok: boolean
  error?: string
  job?: GeoEeatJobPreview
  jobId?: string
  geoJobs: Array<{ measurement: GeoMeasurement; job: GeoEeatJobPreview }>
}> {
  const measurements = parseGeoMeasurementsOrDefaultEqc(input.measurements)
  const geoJobs: Array<{ measurement: GeoMeasurement; job: GeoEeatJobPreview }> = []
  const layerResults = await Promise.all(
    measurements.map(async (measurement) => {
      const geo = await runGeoAnalysisWorkflow(
        {
          url: input.url,
          checkionProjectId: input.checkionProjectId,
          queries: input.queries,
          competitors: input.competitors,
          runCompetitive: Boolean(input.queries?.length),
          generateQueries: !input.queries?.length,
          measurement,
        },
        {
          workflowRunId: undefined,
          onExternalProgress: async (status, progress) => {
            await input.patchStep('geo_check', { status: 'running', progress, detail: status })
            streamPhase(input.emit, `GEO ${measurement}: ${status}${progress > 0 ? ` (${progress}%)` : ''}`)
          },
        }
      )
      return { measurement, geo }
    })
  )
  for (const { measurement, geo } of layerResults) {
    if (!geo.ok || !geo.job) {
      return { ok: false, error: geo.error, geoJobs, job: geoJobs[0]?.job, jobId: geoJobs[0]?.job?.jobId }
    }
    geoJobs.push({ measurement, job: geo.job })
  }
  return {
    ok: true,
    geoJobs,
    job: geoJobs[0]?.job,
    jobId: geoJobs[0]?.job.jobId,
  }
}

async function bindAudionToPlatform(platformProjectId: string, audionProjectId: string): Promise<void> {
  await ensureBindingPlaceholders(platformProjectId);
  await upsertPlatformProjectBinding({
    platformProjectId,
    productId: 'audion',
    externalProjectId: audionProjectId,
    syncStatus: PLATFORM_PROJECT_BINDING_SYNC_STATUS.IN_SYNC,
    syncMessage: `${EVENT_QUICK_CHECK_BINDING_SOURCE}-persona`,
    lastSyncAt: new Date(),
  });
}

async function runQuickResearch(input: {
  user: RequestUser;
  platformProjectId: string;
  url: string;
  onDetail?: (detail: string) => void | Promise<void>;
}): Promise<Record<string, unknown>> {
  const { checkionProjectId, audionProjectId } = await getProjectBindingIds(input.platformProjectId);
  const seedUrl = normalizeUrl(input.url);
  const results: Record<string, unknown> = {};

  if (checkionProjectId) {
    await input.onDetail?.('CHECKION Research wird gestartet…');
    const checkion = await startCheckionProjectResearch(checkionProjectId, input.user.id, { url: seedUrl });
    results.checkion = checkion.ok ? checkion.data : { error: checkion.error };
    if (!checkion.ok) results.checkionError = checkion.error;
  } else {
    results.checkionSkipped = 'Kein CHECKION-Projekt';
  }

  if (audionProjectId) {
    await input.onDetail?.('AUDION Research wird gestartet…');
    const started = await startAudionProjectResearch(audionProjectId, input.user.id, { seedUrl });
    if (!started.ok || !started.runId) {
      results.audionError = started.error ?? 'Start fehlgeschlagen';
    } else {
      const deadline = Date.now() + EVENT_QUICK_CHECK_RESEARCH_MAX_MS;
      let finished = false;
      while (Date.now() < deadline) {
        const poll = await pollAudionProjectResearch(audionProjectId, started.runId, input.user.id);
        if (!poll.ok) {
          results.audionError = poll.error;
          finished = true;
          break;
        }
        await input.onDetail?.(`AUDION Research: ${poll.status ?? 'läuft'}…`);
        if (poll.status === 'completed' || poll.status === 'failed') {
          const latest = await fetchAudionProjectResearchLatest(audionProjectId, input.user.id);
          results.audion = latest.summary;
          if (poll.status === 'failed') results.audionError = 'failed';
          finished = true;
          break;
        }
        await new Promise((r) => setTimeout(r, RESEARCH_POLL_MS));
      }
      if (!finished) {
        results.audionError = 'Timeout – Research läuft im Hintergrund';
      }
    }
  } else {
    results.audionSkipped = 'Kein AUDION-Projekt';
  }

  return results;
}

function audionSyncErrorMessage(
  missing: string[],
  syncResults: Array<{ productId: string; ok: boolean; error?: string }>
): string {
  const audionResult = syncResults.find((r) => r.productId === 'audion');
  const detail = audionResult?.error ? ` (${audionResult.error})` : '';
  if (missing.includes('audion')) {
    return `Kein AUDION-Projekt verknüpft${detail}. Bitte AUDION-Sync im Plattform-Dashboard ausführen und den Quick Check erneut starten.`;
  }
  return 'AUDION-Binding fehlt';
}

export async function runEventQuickCheck(
  input: {
    user: RequestUser;
    projectName: string;
    url: string;
    platformProjectId?: string | null;
  },
  options: EventQuickCheckRunOptions = {}
): Promise<EventQuickCheckResult> {
  // Wave 23 — Collection Flow executor (default on unless explicitly disabled).
  if (isEqcFlowRuntimeEnabled()) {
    return runEqcViaCollectionFlow(input, options);
  }

  const runId = options.workflowRunId;
  const emit = options.emit;
  const runMode = options.runMode ?? 'full_auto';
  const profile = resolveEventQuickCheckProfile(options.depth ?? 'quick', options.profileOverrides);
  let steps = options.initialSteps ?? [...EVENT_QUICK_CHECK_INITIAL_STEPS];
  let companyBrief = options.companyBrief;

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
  const outcomes: EventQuickCheckStepOutcome[] = [];
  const url = normalizeUrl(input.url);
  let projectName = input.projectName.trim() || domainFromUrl(url) || 'Quick Check';
  let platformProjectId = input.platformProjectId?.trim() || undefined;
  let dashboardPath: string | undefined;
  let geoQuestions: string[] | undefined;
  let geoQuestionsByPersona: PersonaGeoQuestionGroup[] | undefined;
  let geoCompetitors: string[] = [];
  let personaPreview: PersonaBootstrapPreview | undefined;
  let domainScan: DomainScanPreview | undefined;
  let geoJob: GeoEeatJobPreview | undefined;
  let geoJobs: Array<{ measurement: GeoMeasurement; job: GeoEeatJobPreview }> | undefined;
  let audionProjectId: string | undefined;
  let audionSetupRequired = false;
  let checkionProjectId: string | null = null;

  steps = await patchStep('prepare', { status: 'running' });
  streamPhase(emit, 'URL und Projektname werden vorbereitet…');
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

  if (runMode === 'after_geo') {
    const checkpoint = options.resumeCheckpoint;
    const confirmedGeoQuestions = options.geoQuestions;
    if (!checkpoint || !confirmedGeoQuestions?.length) {
      return {
        ok: false,
        playbookId: EVENT_QUICK_CHECK_PLAYBOOK_ID,
        playbookLabel: QUICK_CHECK_LABEL,
        projectName,
        url,
        outcomes,
        steps,
        error: 'GEO-Fortsetzung: Checkpoint oder Fragen fehlen',
      };
    }

    let domainScan = checkpoint.domainScan;
    let checkpointOutcomes = [...checkpoint.outcomes];

    if (checkpoint.deepScanStarted && !domainScan) {
      const resolved = await resolveDeepScanForQuickCheck(checkpoint.deepScanStarted);
      if (resolved && !resolved.allComplete) {
        const progressPct =
          resolved.progress.total > 0
            ? Math.round((resolved.progress.complete / resolved.progress.total) * 100)
            : 0;
        steps = await patchStep('domain_scan', {
          status: 'running',
          progress: progressPct,
          detail: resolved.progress.detail,
        });
        streamPhase(emit, `Deep Scan: ${resolved.progress.detail}`);
        return {
          ok: true,
          playbookId: EVENT_QUICK_CHECK_PLAYBOOK_ID,
          playbookLabel: QUICK_CHECK_LABEL,
          projectName: checkpoint.projectName,
          url: checkpoint.url,
          platformProjectId: checkpoint.platformProjectId,
          outcomes: checkpointOutcomes,
          steps,
          dashboardPath: checkpoint.dashboardPath,
          companyBrief: checkpoint.companyBrief,
          personaPreview: checkpoint.personaPreview,
          geoCompetitors: options.geoCompetitors ?? checkpoint.geoCompetitors,
          audionProjectId: checkpoint.audionProjectId,
          audionSetupRequired: checkpoint.audionSetupRequired ?? false,
          checkionProjectId: checkpoint.checkionProjectId ?? null,
          awaitingDeepScanConfirmation: true,
          deepScanProgress: resolved.progress,
          resumeCheckpoint: checkpoint,
        };
      }
      if (resolved?.domainScan) {
        domainScan = resolved.domainScan;
        checkpointOutcomes = mergeDeepScanIntoOutcomes(checkpointOutcomes, resolved);
        steps = await patchStep('domain_scan', {
          status: 'done',
          progress: 100,
          detail: resolved.progress.detail,
        });
      }
    }

    return finishEventQuickCheckFromGeo({
      user: input.user,
      patchStep,
      emit,
      steps,
      outcomes: checkpointOutcomes,
      projectName: checkpoint.projectName,
      url: checkpoint.url,
      platformProjectId: checkpoint.platformProjectId,
      dashboardPath: checkpoint.dashboardPath,
      companyBrief: checkpoint.companyBrief,
      personaPreview: checkpoint.personaPreview,
      domainScan,
      audionProjectId: checkpoint.audionProjectId,
      audionSetupRequired: checkpoint.audionSetupRequired ?? false,
      checkionProjectId: checkpoint.checkionProjectId ?? null,
      geoQuestions: confirmedGeoQuestions,
      geoQuestionsByPersona: options.geoQuestionsByPersona,
      geoMeasurements: options.geoMeasurements,
      geoCompetitors: options.geoCompetitors ?? checkpoint.geoCompetitors,
      echonHandle: checkpoint.echonHandle ?? null,
      echonSkippedReason: checkpoint.echonSkippedReason,
    });
  }

  if (runMode === 'continue_after_competitors') {
    const cp = options.competitorsCheckpoint;
    const confirmed = options.competitorsConfirmed;
    if (!cp || !confirmed?.length) {
      return {
        ok: false,
        playbookId: EVENT_QUICK_CHECK_PLAYBOOK_ID,
        playbookLabel: QUICK_CHECK_LABEL,
        projectName,
        url,
        outcomes,
        steps,
        error: 'Wettbewerber-Fortsetzung: Checkpoint oder Domains fehlen',
      };
    }
    return runEventQuickCheckFromCompetitors({
      user: input.user,
      patchStep,
      emit,
      steps,
      outcomes: [...cp.outcomes],
      profile: resolveEventQuickCheckProfile(cp.depth, options.profileOverrides),
      projectName: cp.projectName,
      url: cp.url,
      platformProjectId: cp.platformProjectId,
      dashboardPath: cp.dashboardPath,
      companyBrief: cp.companyBrief,
      checkionProjectId: cp.checkionProjectId,
      audionProjectId: cp.audionProjectId,
      audionSetupRequired: cp.audionSetupRequired,
      geoCompetitors: confirmed,
      runMode,
    });
  }

  if (runMode === 'continue_after_brief') {
    if (!companyBrief) {
      return {
        ok: false,
        playbookId: EVENT_QUICK_CHECK_PLAYBOOK_ID,
        playbookLabel: QUICK_CHECK_LABEL,
        projectName,
        url,
        outcomes,
        steps,
        error: 'Unternehmensprofil fehlt',
      };
    }
    projectName = companyBrief.displayName.trim() || projectName;
  } else {
    steps = await patchStep('company_research', {
      status: 'running',
      detail: 'Website auswerten…',
    });
    streamPhase(emit, 'Unternehmensprofil wird recherchiert…');
    const draftBrief = await researchCompanyBrief({ url, projectName });
    companyBrief = draftBrief;
    steps = await patchStep('company_research', {
      status: 'done',
      detail: draftBrief.industry.slice(0, 80),
    });
    outcomes.push({
      stepId: 'company_research',
      label: 'Unternehmen recherchieren',
      status: 'done',
      data: { displayName: draftBrief.displayName, industry: draftBrief.industry },
    });

    if (runMode === 'company_research_only') {
      steps = await patchStep('company_brief_confirm', {
        status: 'running',
        detail: 'Bitte Profil prüfen und bestätigen',
      });
      return {
        ok: true,
        playbookId: EVENT_QUICK_CHECK_PLAYBOOK_ID,
        playbookLabel: QUICK_CHECK_LABEL,
        projectName,
        url,
        outcomes,
        steps,
        companyBrief: draftBrief,
        awaitingCompanyBriefConfirmation: true,
      };
    }

    if (runMode === 'full_auto') {
      steps = await patchStep('company_brief_confirm', {
        status: 'done',
        detail: 'Automatisch',
      });
      outcomes.push({
        stepId: 'company_brief_confirm',
        label: 'Unternehmensprofil bestätigen',
        status: 'done',
        data: { auto: true },
      });
      projectName = draftBrief.displayName.trim() || projectName;
    } else {
      return {
        ok: false,
        playbookId: EVENT_QUICK_CHECK_PLAYBOOK_ID,
        playbookLabel: QUICK_CHECK_LABEL,
        projectName,
        url,
        outcomes,
        steps,
        error: 'Unternehmensprofil nicht bestätigt',
      };
    }
  }

  let echonHandle: EchonQuickCheckResearchHandle | null = null;
  let echonSkippedReason: string | undefined;

  if (EVENT_QUICK_CHECK_ECHON_RESEARCH_ENABLED) {
    steps = await patchStep('echon_market_research', {
      status: 'running',
      detail: 'ECHON Markt-Research starten…',
    });
    if (isEchonQuickCheckResearchEnabled()) {
      streamPhase(emit, 'ECHON Markt-Research wird gestartet…');
      const started = await startEchonQuickCheckResearch(projectName, url);
      if (started.ok) {
        echonHandle = started.handle;
        steps = await patchStep('echon_market_research', {
          status: 'running',
          detail: `Läuft parallel · ${started.handle.threadId.slice(0, 8)}…`,
        });
      } else {
        echonSkippedReason = started.userMessage;
        steps = await patchStep('echon_market_research', {
          status: 'done',
          detail: echonSkippedReason,
        });
      }
    } else {
      echonSkippedReason = echonQuickCheckMissingEnvMessage();
      steps = await patchStep('echon_market_research', {
        status: 'done',
        detail: echonSkippedReason,
      });
    }
  }

  if (platformProjectId) {
    steps = await patchStep('create_project', {
      status: 'done',
      detail: `Bestehend: ${platformProjectId}`,
    });
    outcomes.push({
      stepId: 'create_project',
      label: 'Plattform-Projekt',
      status: 'skipped',
      skipReason: 'Projekt bereits im Kontext',
      data: { platformProjectId },
    });
    dashboardPath = pathPlatformProjectDashboard(platformProjectId);
  } else {
    steps = await patchStep('create_project', { status: 'running' });
    streamPhase(emit, 'Plattform-Projekt wird angelegt…');
    const created = await createPlatformProjectWorkflow(
      input.user,
      { name: projectName, domain: domainFromUrl(url), syncProducts: true },
      {}
    );
    if (!created.result.ok || !created.result.platformProjectId) {
      steps = await patchStep('create_project', {
        status: 'error',
        detail: created.result.error,
      });
      outcomes.push({
        stepId: 'create_project',
        label: 'Plattform-Projekt',
        status: 'error',
        error: created.result.error ?? 'Anlage fehlgeschlagen',
        data: { optional: true },
      });
      // CHECKION (Scan/GEO) continues URL-only; Persona needs a project later.
    } else {
      platformProjectId = created.result.platformProjectId;
      dashboardPath = created.result.dashboardPath;
      steps = await patchStep('create_project', {
        status: 'done',
        detail: platformProjectId,
      });
      outcomes.push({
        stepId: 'create_project',
        label: 'Plattform-Projekt',
        status: 'done',
        data: { platformProjectId },
      });
    }
  }

  const deferScanForCompetitorsGate = profile.scanCompetitors && runMode === 'continue_after_brief';

  let ensured: Awaited<ReturnType<typeof ensurePlatformProductBindings>> | undefined;
  let scanPromise: ReturnType<typeof runDomainScanWorkflow> | null = null;

  if (platformProjectId) {
    steps = await patchStep('ensure_audion', { status: 'running', detail: 'AUDION zuerst, dann CHECKION…' });
    streamPhase(emit, 'AUDION & CHECKION werden verknüpft…');
    ensured = await ensurePlatformProductBindings(platformProjectId, {
      source: EVENT_QUICK_CHECK_BINDING_SOURCE,
      domain: domainFromUrl(url),
      required: ['audion', 'checkion'],
    });
    audionProjectId = ensured.audionProjectId ?? undefined;
    checkionProjectId = ensured.checkionProjectId;

    if (!ensured.audionProjectId) {
      streamPhase(emit, 'AUDION-Sync fehlgeschlagen — direkte Projekt-Anlage…');
      await patchStep('ensure_audion', { status: 'running', detail: 'AUDION-Projekt direkt anlegen…' });
      const direct = await provisionAudionDirect({
        projectName,
        platformProjectId,
        source: EVENT_QUICK_CHECK_BINDING_SOURCE,
      });
      if (direct.ok) {
        audionProjectId = direct.audionProjectId;
        audionSetupRequired = false;
        steps = await patchStep('ensure_audion', {
          status: 'done',
          detail: direct.bound ? direct.audionProjectId : `Direkt: ${direct.audionProjectId}`,
        });
        outcomes.push({
          stepId: 'ensure_audion',
          label: 'AUDION-Projekt einrichten',
          status: 'done',
          data: {
            audionProjectId: direct.audionProjectId,
            fallback: 'direct_create',
            syncResults: ensured.syncResults,
          },
        });
      } else {
        audionSetupRequired = true;
        const err = `${audionSyncErrorMessage(ensured.missingRequired, ensured.syncResults)} · Direkt-Anlage: ${direct.error}`;
        steps = await patchStep('ensure_audion', { status: 'error', detail: err });
        outcomes.push({
          stepId: 'ensure_audion',
          label: 'AUDION-Projekt einrichten',
          status: 'error',
          error: err,
          data: { syncResults: ensured.syncResults, missingRequired: ensured.missingRequired, optional: true },
        });
      }
    } else {
      steps = await patchStep('ensure_audion', {
        status: 'done',
        detail: ensured.audionProjectId,
      });
      outcomes.push({
        stepId: 'ensure_audion',
        label: 'AUDION-Projekt einrichten',
        status: 'done',
        data: {
          audionProjectId: ensured.audionProjectId,
          checkionProjectId: ensured.checkionProjectId,
          domainPatched: ensured.domainPatched,
          syncResults: ensured.syncResults,
        },
      });
    }

    if (deferScanForCompetitorsGate && checkionProjectId && companyBrief) {
      steps = await patchStep('competitors_suggest', { status: 'running', detail: 'CHECKION…' });
      streamPhase(emit, 'Wettbewerber werden vorgeschlagen…');
      const suggested = await suggestCheckionProjectCompetitors({
        projectId: checkionProjectId,
        url,
      });
      const draftCompetitors = suggested.ok
        ? suggested.competitors.slice(0, profile.maxCompetitors)
        : [];
      steps = await patchStep('competitors_suggest', {
        status: suggested.ok ? 'done' : 'error',
        detail: draftCompetitors.length
          ? `${draftCompetitors.length} Vorschläge`
          : suggested.ok
            ? 'Keine Vorschläge — bitte manuell ergänzen'
            : suggested.error,
      });
      outcomes.push({
        stepId: 'competitors_suggest',
        label: 'Wettbewerber vorschlagen',
        status: suggested.ok ? 'done' : 'error',
        error: suggested.ok ? undefined : suggested.error,
        data: { competitors: draftCompetitors, queries: suggested.ok ? suggested.queries : [] },
      });

      steps = await patchStep('competitors_confirm', {
        status: 'running',
        detail: 'Bitte Wettbewerber prüfen',
      });

      const competitorsCheckpoint = buildEventQuickCheckCompetitorsCheckpoint({
        projectName,
        url,
        platformProjectId,
        dashboardPath,
        checkionProjectId,
        audionProjectId,
        audionSetupRequired,
        companyBrief,
        outcomes,
        depth: profile.depth,
      });

      return {
        ok: true,
        playbookId: EVENT_QUICK_CHECK_PLAYBOOK_ID,
        playbookLabel: QUICK_CHECK_LABEL,
        projectName,
        url,
        platformProjectId,
        outcomes,
        steps,
        dashboardPath,
        audionProjectId,
        audionSetupRequired,
        companyBrief,
        awaitingCompetitorsConfirmation: true,
        competitorsDraft: draftCompetitors,
        competitorsCheckpoint,
      };
    }

    if (deferScanForCompetitorsGate && !checkionProjectId) {
      steps = await patchStep('competitors_suggest', {
        status: 'error',
        detail: 'Kein CHECKION-Projekt',
      });
      outcomes.push({
        stepId: 'competitors_suggest',
        label: 'Wettbewerber vorschlagen',
        status: 'error',
        error: 'CHECKION-Projekt erforderlich für Komplettscan',
      });
    }
  }

  // Domain-Scan after CHECKION binding — v3 `/api/domain-scans` requires projectId.
  if (!deferScanForCompetitorsGate) {
    streamPhase(emit, `Domain-Scan startet (${profile.scanMaxPages} Seiten)…`);
    steps = await patchStep('domain_scan', { status: 'running', progress: 5, detail: 'Scan wird gestartet…' });
    scanPromise = runDomainScanWorkflow(
      {
        url,
        checkionProjectId: checkionProjectId ?? null,
        maxPages: profile.scanMaxPages,
      },
      {
        onExternalProgress: async (status, progress) => {
          await patchStep('domain_scan', {
            status: 'running',
            ...(progress != null ? { progress } : {}),
            detail: status,
          });
          streamPhase(
            emit,
            `Domain-Scan: ${status}${progress != null && progress > 0 ? ` (${progress}%)` : ''}`
          );
        },
      }
    );
  }

  if (platformProjectId) {
    steps = await patchStep('parallel_research', { status: 'running', detail: 'CHECKION & AUDION…' });
    streamPhase(emit, 'Website-Research startet…');
    const researchPromise = runQuickResearch({
      user: input.user,
      platformProjectId,
      url,
      onDetail: async (detail) => {
        await patchStep('parallel_research', { status: 'running', detail });
        streamPhase(emit, detail);
      },
    });

    const [research, scan] = await Promise.all([
      researchPromise,
      scanPromise ?? Promise.resolve({ ok: false as const, error: 'Scan nicht gestartet', steps }),
    ]);

    const researchFailed = Boolean(research.checkionError && research.audionError);
    steps = await patchStep('parallel_research', {
      status: researchFailed ? 'error' : 'done',
      detail: researchFailed ? 'Teilweise fehlgeschlagen' : 'Gestartet',
    });
    outcomes.push({
      stepId: 'parallel_research',
      label: 'Research',
      status: researchFailed ? 'error' : 'done',
      data: research,
      ...(researchFailed
        ? { error: String(research.audionError ?? research.checkionError ?? 'Fehler') }
        : {}),
    });

    if (!scan.ok) {
      steps = await patchStep('domain_scan', { status: 'error', detail: scan.error });
      outcomes.push({
        stepId: 'domain_scan',
        label: 'Domain-Scan (50 Seiten)',
        status: 'error',
        error: scan.error,
      });
    } else {
      domainScan = scan.scan;
      steps = await patchStep('domain_scan', {
        status: 'done',
        detail: scan.scanId ?? 'OK',
        progress: 100,
      });
      outcomes.push({
        stepId: 'domain_scan',
        label: 'Domain-Scan (50 Seiten)',
        status: 'done',
        data: { scanId: scan.scanId, preview: scan.scan, projectOptional: true },
      });
    }
  } else {
    steps = await patchStep('ensure_audion', {
      status: 'done',
      detail: 'Übersprungen (kein Plattform-Projekt)',
    });
    outcomes.push({
      stepId: 'ensure_audion',
      label: 'AUDION-Projekt einrichten',
      status: 'skipped',
      skipReason: 'Kein Plattform-Projekt — Persona wird direkt in AUDION angelegt',
    });
    // Persona bootstrap will create AUDION project directly if needed.

    steps = await patchStep('parallel_research', {
      status: 'done',
      detail: 'Übersprungen',
    });
    outcomes.push({
      stepId: 'parallel_research',
      label: 'Research',
      status: 'skipped',
      skipReason: 'Plattform-Projekt erforderlich',
    });

    const scan = scanPromise ? await scanPromise : { ok: false as const, error: 'Scan nicht gestartet', steps };
    if (!scan.ok) {
      steps = await patchStep('domain_scan', { status: 'error', detail: scan.error });
      outcomes.push({
        stepId: 'domain_scan',
        label: 'Domain-Scan (50 Seiten)',
        status: 'error',
        error: scan.error,
      });
    } else {
      domainScan = scan.scan;
      steps = await patchStep('domain_scan', {
        status: 'done',
        detail: scan.scanId ?? 'OK',
        progress: 100,
      });
      outcomes.push({
        stepId: 'domain_scan',
        label: 'Domain-Scan (50 Seiten)',
        status: 'done',
        data: { scanId: scan.scanId, preview: scan.scan, projectOptional: true },
      });
    }
  }

  if (url) {
    const personaStepDetail =
      (profile.targetGroupCount > 1 || profile.personaCount > 1) ? 'Zielgruppen & Personas…' : 'Zielgruppe & Persona…';
    steps = await patchStep('persona_bootstrap', { status: 'running', detail: personaStepDetail });
    streamPhase(
      emit,
      (profile.targetGroupCount > 1 || profile.personaCount > 1) ? 'AUDION Personas werden erstellt…' : 'AUDION Persona wird erstellt…'
    );
    steps = await patchStep('geo_questions', { status: 'running' });

    const personaGeo = await runPersonaAndGeoQuestionsStep({
      profile,
      projectName,
      url,
      audionProjectId,
      companyBrief,
      geoCompetitors,
      platformProjectId,
      bindAudion: async (ppId, apId) => {
        if (!ensured?.audionProjectId) {
          await bindAudionToPlatform(ppId, apId);
        }
      },
    });

    personaPreview = personaGeo.personaPreview;
    audionProjectId = personaGeo.audionProjectId;
    audionSetupRequired = personaGeo.audionSetupRequired;
    geoQuestions = personaGeo.geoQuestions;
    geoQuestionsByPersona = personaGeo.geoQuestionsByPersona;
    geoCompetitors = personaGeo.geoCompetitors;

    steps = await patchStep('persona_bootstrap', {
      status: personaGeo.personaOutcome.status === 'done' ? 'done' : 'error',
      detail: personaGeo.personaPreview
        ? personaBootstrapDetailLabel(personaGeo.personaPreview)
        : personaGeo.personaOutcome.error ?? 'Fehler',
    });
    outcomes.push(personaGeo.personaOutcome);

    const personasReady = listPersonasFromPreview(personaPreview).length > 0;
    if (!personasReady || personaGeo.personaOutcome.status !== 'done') {
      steps = await patchStep('geo_questions', {
        status: 'error',
        detail: personaGeo.geoOutcome.error ?? PERSONA_REQUIRED_ERROR,
      });
      outcomes.push(personaGeo.geoOutcome);
      steps = await patchStep('geo_questions_confirm', {
        status: 'error',
        detail: 'Persona erforderlich',
      });
      steps = await patchStep('geo_check', {
        status: 'error',
        detail: 'Übersprungen — Persona fehlt',
      });
      steps = await patchStep('aggregate', {
        status: 'error',
        detail: 'Ohne AUDION-Persona kein Quick Check',
      });
      return {
        ok: false,
        playbookId: EVENT_QUICK_CHECK_PLAYBOOK_ID,
        playbookLabel: QUICK_CHECK_LABEL,
        projectName,
        url,
        platformProjectId,
        outcomes,
        steps,
        dashboardPath,
        geoQuestions: [],
        domainScan,
        personaPreview,
        audionProjectId,
        audionSetupRequired: true,
        companyBrief,
        geoCompetitors,
        checkionProjectId: checkionProjectId ?? undefined,
        error: personaGeo.personaOutcome.error ?? PERSONA_REQUIRED_ERROR,
      };
    }

    streamPhase(
      emit,
      (profile.targetGroupCount > 1 || profile.personaCount > 1)
        ? 'GEO-Fragen pro Persona ableiten…'
        : 'GEO-Fragen aus Persona ableiten…'
    );
    steps = await patchStep('geo_questions', {
      status: personaGeo.geoOutcome.status === 'done' ? 'done' : 'error',
      detail: geoQuestions?.length
        ? `${geoQuestions.length} Fragen${
            geoQuestionsByPersona?.length ? ` · ${geoQuestionsByPersona.length} Personas` : ''
          }`
        : personaGeo.geoOutcome.error ?? 'Keine Fragen',
    });
    outcomes.push(personaGeo.geoOutcome);

    if (runMode !== 'full_auto' && geoQuestions?.length) {
      steps = await patchStep('geo_questions_confirm', {
        status: 'running',
        detail: 'Bitte GEO-Fragen prüfen',
      });
      const resumeCheckpoint = buildEventQuickCheckResumeCheckpoint({
        projectName,
        url,
        platformProjectId,
        dashboardPath,
        audionProjectId,
        checkionProjectId: checkionProjectId ?? undefined,
        audionSetupRequired,
        outcomes,
        steps,
        companyBrief,
        personaPreview,
        domainScan,
        geoCompetitors,
        echonHandle,
        echonSkippedReason,
      });
      return {
        ok: true,
        playbookId: EVENT_QUICK_CHECK_PLAYBOOK_ID,
        playbookLabel: QUICK_CHECK_LABEL,
        projectName,
        url,
        platformProjectId,
        outcomes,
        steps,
        dashboardPath,
        geoQuestions,
        geoQuestionsByPersona,
        geoCompetitors,
        domainScan,
        personaPreview,
        audionProjectId,
        audionSetupRequired,
        companyBrief,
        awaitingGeoQuestionsConfirmation: true,
        resumeCheckpoint,
      };
    }

    steps = await patchStep('geo_questions_confirm', {
      status: 'done',
      detail: 'Automatisch',
    });

    steps = await patchStep('geo_check', { status: 'running', progress: 10, detail: 'GEO-Job starten…' });
    streamPhase(emit, 'GEO / E-E-A-T Analyse läuft…');
    const geo = await runGeoLayersForQuickCheck({
      url,
      checkionProjectId: checkionProjectId ?? ensured?.checkionProjectId ?? null,
      queries: geoQuestions,
      competitors: geoCompetitors,
      measurements: options.geoMeasurements,
      patchStep,
      emit,
    });
    if (!geo.ok) {
      steps = await patchStep('geo_check', { status: 'error', detail: geo.error });
      outcomes.push({
        stepId: 'geo_check',
        label: 'GEO Competitive Check',
        status: 'error',
        error: geo.error,
      });
    } else {
      geoJob = geo.job;
      geoJobs = geo.geoJobs;
      steps = await patchStep('geo_check', {
        status: 'done',
        progress: 100,
        detail: geo.job?.overallScore != null ? `Score ${geo.job.overallScore}` : geo.jobId,
      });
      outcomes.push({
        stepId: 'geo_check',
        label: 'GEO Competitive Check',
        status: 'done',
        data: { jobId: geo.jobId, job: geo.job, questions: geoQuestions, measurements: options.geoMeasurements },
      });
    }
  }

  const checkionSucceeded = outcomes.some(
    (o) => (o.stepId === 'domain_scan' || o.stepId === 'geo_check') && o.status === 'done'
  );
  const personaSucceeded = outcomes.some((o) => o.stepId === 'persona_bootstrap' && o.status === 'done');
  const checkionOnly = checkionSucceeded && !personaSucceeded && audionSetupRequired;

  let echonMarket: EventQuickCheckResult['echonMarket'];

  if (EVENT_QUICK_CHECK_ECHON_RESEARCH_ENABLED) {
    if (echonHandle) {
      streamPhase(emit, 'ECHON Markt-Research wird abgeschlossen…');
      steps = await patchStep('echon_market_research', {
        status: 'running',
        detail: 'Ergebnis abrufen…',
      });
      const market = await finalizeEchonQuickCheckResearch(echonHandle, {
        onPoll: async (detail) => {
          await patchStep('echon_market_research', { status: 'running', detail });
          streamPhase(emit, `ECHON: ${detail}`);
        },
      });
      echonMarket = market;
      if (market.available) {
        steps = await patchStep('echon_market_research', {
          status: 'done',
          detail: `${market.keyFindings?.length ?? 0} Erkenntnisse`,
        });
        outcomes.push({
          stepId: 'echon_market_research',
          label: 'ECHON Markt-Research',
          status: 'done',
          data: {
            threadId: market.threadId,
            runId: market.runId,
            findingCount: market.keyFindings?.length ?? 0,
          },
        });
        if (platformProjectId) {
          const { distillEchonMarketToKnowledgePack } = await import(
            '@/lib/assistant/knowledge-pack/distill-echon-market'
          );
          void distillEchonMarketToKnowledgePack({
            platformProjectId,
            market,
          });
        }
      } else if (market.reason === 'echon_poll_timeout') {
        steps = await patchStep('echon_market_research', {
          status: 'done',
          detail: 'Timeout — läuft im Hintergrund',
        });
        outcomes.push({
          stepId: 'echon_market_research',
          label: 'ECHON Markt-Research',
          status: 'done',
          data: {
            threadId: market.threadId,
            runId: market.runId,
            partial: true,
            reason: market.reason,
          },
        });
      } else {
        steps = await patchStep('echon_market_research', {
          status: 'error',
          detail: market.reason ?? 'Fehler',
        });
        outcomes.push({
          stepId: 'echon_market_research',
          label: 'ECHON Markt-Research',
          status: 'error',
          error: market.reason ?? 'ECHON Research fehlgeschlagen',
          data: { threadId: market.threadId, runId: market.runId },
        });
      }
    } else if (echonSkippedReason) {
      outcomes.push({
        stepId: 'echon_market_research',
        label: 'ECHON Markt-Research',
        status: 'skipped',
        skipReason: echonSkippedReason,
      });
    }
  }

  const anySuccess = outcomes.some((o) => o.status === 'done');
  const hardFailed = !anySuccess;
  steps = await patchStep('aggregate', {
    status: hardFailed ? 'error' : 'done',
    detail: checkionOnly ? 'CHECKION-Teilcheck (ohne Persona)' : undefined,
  });

  return {
    ok: anySuccess && !hardFailed,
    playbookId: EVENT_QUICK_CHECK_PLAYBOOK_ID,
    playbookLabel: QUICK_CHECK_LABEL,
    projectName,
    url,
    platformProjectId,
    outcomes,
    steps,
    dashboardPath,
    geoQuestions,
    geoJob,
    geoJobs,
    domainScan,
    personaPreview,
    audionProjectId,
    audionSetupRequired,
    checkionOnly,
    echonMarket,
    companyBrief,
    geoCompetitors,
    checkionProjectId: checkionProjectId ?? undefined,
    error: hardFailed
      ? 'Pflicht-Schritt fehlgeschlagen'
      : audionSetupRequired && !personaSucceeded
        ? 'CHECKION-Ergebnisse verfügbar — für Persona & persona-GEO AUDION-Projekt einrichten und erneut starten'
        : undefined,
  };
}

type FromCompetitorsInput = {
  user: RequestUser;
  patchStep: (stepId: string, patch: Partial<WorkflowStep>) => Promise<WorkflowStep[]>;
  emit?: WorkflowStepEmitter;
  steps: WorkflowStep[];
  outcomes: EventQuickCheckStepOutcome[];
  profile: EventQuickCheckProfile;
  projectName: string;
  url: string;
  platformProjectId: string;
  dashboardPath?: string;
  companyBrief: EventQuickCheckCompanyBrief;
  checkionProjectId: string;
  audionProjectId?: string;
  audionSetupRequired: boolean;
  geoCompetitors: string[];
  runMode: EventQuickCheckRunMode;
};

async function runEventQuickCheckFromCompetitors(
  input: FromCompetitorsInput
): Promise<EventQuickCheckResult> {
  let { steps, outcomes } = input;
  let domainScan: DomainScanPreview | undefined;
  let geoQuestions: string[] | undefined;
  let geoQuestionsByPersona: PersonaGeoQuestionGroup[] | undefined;
  let personaPreview: PersonaBootstrapPreview | undefined;
  let audionProjectId = input.audionProjectId;
  let audionSetupRequired = input.audionSetupRequired;
  let geoCompetitors = [...input.geoCompetitors];
  const {
    patchStep,
    emit,
    profile,
    projectName,
    url,
    platformProjectId,
    dashboardPath,
    companyBrief,
    checkionProjectId,
    runMode,
  } = input;

  steps = await patchStep('competitors_confirm', {
    status: 'done',
    detail: `${geoCompetitors.length} Wettbewerber`,
  });

  steps = await patchStep('domain_scan', { status: 'running', progress: 5, detail: 'domain-scan-all…' });
  streamPhase(emit, `Deep Scan: ${profile.scanMaxPages} Seiten + ${geoCompetitors.length} Wettbewerber…`);

  steps = await patchStep('parallel_research', { status: 'running', detail: 'CHECKION & AUDION…' });
  const researchPromise = runQuickResearch({
    user: input.user,
    platformProjectId,
    url,
    onDetail: async (detail) => {
      await patchStep('parallel_research', { status: 'running', detail });
      streamPhase(emit, detail);
    },
  });

  const started = await startCheckionProjectDomainScanAll({
    projectId: checkionProjectId,
    maxPages: profile.scanMaxPages,
    aiFillProjectMetadata: false,
  });

  let deepScanStarted: CheckionProjectDeepScanStarted | undefined;

  if (!started.ok) {
    steps = await patchStep('domain_scan', { status: 'error', detail: started.error });
    outcomes.push({
      stepId: 'domain_scan',
      label: `Domain-Scan (${profile.scanMaxPages} Seiten + Wettbewerber)`,
      status: 'error',
      error: started.error,
    });
  } else {
    deepScanStarted = started.started;
    steps = await patchStep('domain_scan', {
      status: 'running',
      progress: 0,
      detail: 'CHECKION Deep Scan im Hintergrund…',
    });
    outcomes.push({
      stepId: 'domain_scan',
      label: `Domain-Scan (${profile.scanMaxPages} Seiten + Wettbewerber)`,
      status: 'done',
      data: { deepScanStarted: started.started, background: true },
    });
    streamPhase(
      emit,
      `Deep Scan gestartet (${profile.scanMaxPages} Seiten × ${1 + geoCompetitors.length} Domains) — Personas & GEO parallel.`
    );
  }

  const research = await researchPromise;
  const researchFailed = Boolean(research.checkionError && research.audionError);
  steps = await patchStep('parallel_research', {
    status: researchFailed ? 'error' : 'done',
    detail: researchFailed ? 'Teilweise fehlgeschlagen' : 'Gestartet',
  });
  outcomes.push({
    stepId: 'parallel_research',
    label: 'Research',
    status: researchFailed ? 'error' : 'done',
    data: research,
    ...(researchFailed
      ? { error: String(research.audionError ?? research.checkionError ?? 'Fehler') }
      : {}),
  });

  const personaStepDetail =
    (profile.targetGroupCount > 1 || profile.personaCount > 1) ? 'Zielgruppen & Personas…' : 'Zielgruppe & Persona…';
  steps = await patchStep('persona_bootstrap', { status: 'running', detail: personaStepDetail });
  streamPhase(
    emit,
    (profile.targetGroupCount > 1 || profile.personaCount > 1) ? 'AUDION Personas werden erstellt…' : 'AUDION Persona wird erstellt…'
  );
  steps = await patchStep('geo_questions', { status: 'running' });

  const personaGeo = await runPersonaAndGeoQuestionsStep({
    profile,
    projectName,
    url,
    audionProjectId,
    companyBrief,
    geoCompetitors,
    platformProjectId,
    bindAudion: bindAudionToPlatform,
  });

  personaPreview = personaGeo.personaPreview;
  audionProjectId = personaGeo.audionProjectId;
  audionSetupRequired = personaGeo.audionSetupRequired;
  geoQuestions = personaGeo.geoQuestions;
  geoQuestionsByPersona = personaGeo.geoQuestionsByPersona;
  geoCompetitors = personaGeo.geoCompetitors;

  steps = await patchStep('persona_bootstrap', {
    status: personaGeo.personaOutcome.status === 'done' ? 'done' : 'error',
    detail: personaGeo.personaPreview
      ? personaBootstrapDetailLabel(personaGeo.personaPreview)
      : personaGeo.personaOutcome.error ?? 'Fehler',
  });
  outcomes.push(personaGeo.personaOutcome);

  const personasReady = listPersonasFromPreview(personaPreview).length > 0;
  if (!personasReady || personaGeo.personaOutcome.status !== 'done') {
    steps = await patchStep('geo_questions', {
      status: 'error',
      detail: personaGeo.geoOutcome.error ?? PERSONA_REQUIRED_ERROR,
    });
    outcomes.push(personaGeo.geoOutcome);
    steps = await patchStep('geo_questions_confirm', {
      status: 'error',
      detail: 'Persona erforderlich',
    });
    steps = await patchStep('geo_check', {
      status: 'error',
      detail: 'Übersprungen — Persona fehlt',
    });
    steps = await patchStep('aggregate', {
      status: 'error',
      detail: 'Ohne AUDION-Persona kein Quick Check',
    });
    return {
      ok: false,
      playbookId: EVENT_QUICK_CHECK_PLAYBOOK_ID,
      playbookLabel: QUICK_CHECK_LABEL,
      projectName,
      url,
      platformProjectId,
      outcomes,
      steps,
      dashboardPath,
      geoQuestions: [],
      domainScan,
      personaPreview,
      audionProjectId,
      audionSetupRequired: true,
      companyBrief,
      geoCompetitors,
      checkionProjectId: checkionProjectId ?? undefined,
      error: personaGeo.personaOutcome.error ?? PERSONA_REQUIRED_ERROR,
    };
  }

  streamPhase(
    emit,
    (profile.targetGroupCount > 1 || profile.personaCount > 1)
      ? 'GEO-Fragen pro Persona ableiten…'
      : 'GEO-Fragen aus Persona ableiten…'
  );
  steps = await patchStep('geo_questions', {
    status: personaGeo.geoOutcome.status === 'done' ? 'done' : 'error',
    detail: geoQuestions?.length
      ? `${geoQuestions.length} Fragen${
          geoQuestionsByPersona?.length ? ` · ${geoQuestionsByPersona.length} Personas` : ''
        }`
      : personaGeo.geoOutcome.error ?? 'Keine Fragen',
  });
  outcomes.push(personaGeo.geoOutcome);

  if (runMode !== 'full_auto' && geoQuestions?.length) {
    steps = await patchStep('geo_questions_confirm', {
      status: 'running',
      detail: 'Bitte GEO-Fragen prüfen',
    });
    const resumeCheckpoint = buildEventQuickCheckResumeCheckpoint({
      projectName,
      url,
      platformProjectId,
      dashboardPath,
      audionProjectId,
      checkionProjectId,
      audionSetupRequired,
      outcomes,
      steps,
      companyBrief,
      personaPreview,
      domainScan,
      geoCompetitors,
      echonHandle: null,
      deepScanStarted,
    });
    return {
      ok: true,
      playbookId: EVENT_QUICK_CHECK_PLAYBOOK_ID,
      playbookLabel: QUICK_CHECK_LABEL,
      projectName,
      url,
      platformProjectId,
      outcomes,
      steps,
      dashboardPath,
      geoQuestions,
      geoQuestionsByPersona,
      geoCompetitors,
      domainScan,
      personaPreview,
      audionProjectId,
      audionSetupRequired,
      companyBrief,
      awaitingGeoQuestionsConfirmation: true,
      resumeCheckpoint,
    };
  }

  return finishEventQuickCheckFromGeo({
    user: input.user,
    patchStep,
    emit,
    steps,
    outcomes,
    projectName,
    url,
    platformProjectId,
    dashboardPath,
    companyBrief,
    personaPreview,
    domainScan,
    audionProjectId,
    audionSetupRequired,
    checkionProjectId,
    geoQuestions: geoQuestions ?? [],
    geoQuestionsByPersona,
    geoCompetitors,
    echonHandle: null,
  });
}

type FinishFromGeoInput = {
  user: RequestUser;
  patchStep: (stepId: string, patch: Partial<WorkflowStep>) => Promise<WorkflowStep[]>;
  emit?: WorkflowStepEmitter;
  steps: WorkflowStep[];
  outcomes: EventQuickCheckStepOutcome[];
  projectName: string;
  url: string;
  platformProjectId?: string;
  dashboardPath?: string;
  companyBrief?: EventQuickCheckCompanyBrief;
  personaPreview?: PersonaBootstrapPreview;
  domainScan?: DomainScanPreview;
  audionProjectId?: string;
  audionSetupRequired: boolean;
  checkionProjectId: string | null;
  geoQuestions: string[];
  geoQuestionsByPersona?: PersonaGeoQuestionGroup[];
  geoMeasurements?: GeoMeasurement[];
  geoCompetitors: string[];
  echonHandle: EchonQuickCheckResearchHandle | null;
  echonSkippedReason?: string;
};

async function finishEventQuickCheckFromGeo(
  input: FinishFromGeoInput
): Promise<EventQuickCheckResult> {
  let { steps, outcomes } = input;
  const {
    patchStep,
    emit,
    user,
    projectName,
    url,
    platformProjectId,
    dashboardPath,
    companyBrief,
    personaPreview,
    domainScan,
    audionProjectId,
    audionSetupRequired,
    checkionProjectId,
    geoQuestions,
    geoQuestionsByPersona,
    geoCompetitors,
    echonHandle,
    echonSkippedReason,
  } = input;

  void user;

  steps = await patchStep('geo_questions_confirm', { status: 'done', detail: 'Bestätigt' });

  steps = await patchStep('geo_check', { status: 'running', progress: 10, detail: 'GEO-Job starten…' });
  streamPhase(emit, 'GEO / E-E-A-T Analyse läuft…');
  const geo = await runGeoLayersForQuickCheck({
    url,
    checkionProjectId,
    queries: geoQuestions,
    competitors: geoCompetitors,
    measurements: input.geoMeasurements,
    patchStep,
    emit,
  });

  let geoJob: GeoEeatJobPreview | undefined;
  let geoJobs: Array<{ measurement: GeoMeasurement; job: GeoEeatJobPreview }> | undefined;
  if (!geo.ok) {
    steps = await patchStep('geo_check', { status: 'error', detail: geo.error });
    outcomes.push({
      stepId: 'geo_check',
      label: 'GEO Competitive Check',
      status: 'error',
      error: geo.error,
    });
  } else {
    geoJob = geo.job;
    geoJobs = geo.geoJobs;
    steps = await patchStep('geo_check', {
      status: 'done',
      progress: 100,
      detail: geo.job?.overallScore != null ? `Score ${geo.job.overallScore}` : geo.jobId,
    });
    outcomes.push({
      stepId: 'geo_check',
      label: 'GEO Competitive Check',
      status: 'done',
      data: { jobId: geo.jobId, job: geo.job, questions: geoQuestions },
    });
  }

  const checkionSucceeded = outcomes.some(
    (o) => (o.stepId === 'domain_scan' || o.stepId === 'geo_check') && o.status === 'done'
  );
  const personaSucceeded = outcomes.some((o) => o.stepId === 'persona_bootstrap' && o.status === 'done');
  const checkionOnly = checkionSucceeded && !personaSucceeded && audionSetupRequired;

  let echonMarket: EventQuickCheckResult['echonMarket'];

  if (EVENT_QUICK_CHECK_ECHON_RESEARCH_ENABLED) {
    if (echonHandle) {
      streamPhase(emit, 'ECHON Markt-Research wird abgeschlossen…');
      steps = await patchStep('echon_market_research', {
        status: 'running',
        detail: 'Ergebnis abrufen…',
      });
      const market = await finalizeEchonQuickCheckResearch(echonHandle, {
        onPoll: async (detail) => {
          await patchStep('echon_market_research', { status: 'running', detail });
          streamPhase(emit, `ECHON: ${detail}`);
        },
      });
      echonMarket = market;
      if (market.available) {
        steps = await patchStep('echon_market_research', {
          status: 'done',
          detail: `${market.keyFindings?.length ?? 0} Erkenntnisse`,
        });
        outcomes.push({
          stepId: 'echon_market_research',
          label: 'ECHON Markt-Research',
          status: 'done',
          data: {
            threadId: market.threadId,
            runId: market.runId,
            findingCount: market.keyFindings?.length ?? 0,
          },
        });
        if (platformProjectId) {
          const { distillEchonMarketToKnowledgePack } = await import(
            '@/lib/assistant/knowledge-pack/distill-echon-market'
          );
          void distillEchonMarketToKnowledgePack({
            platformProjectId,
            market,
          });
        }
      } else if (market.reason === 'echon_poll_timeout') {
        steps = await patchStep('echon_market_research', {
          status: 'done',
          detail: 'Timeout — läuft im Hintergrund',
        });
        outcomes.push({
          stepId: 'echon_market_research',
          label: 'ECHON Markt-Research',
          status: 'done',
          data: {
            threadId: market.threadId,
            runId: market.runId,
            partial: true,
            reason: market.reason,
          },
        });
      } else {
        steps = await patchStep('echon_market_research', {
          status: 'error',
          detail: market.reason ?? 'Fehler',
        });
        outcomes.push({
          stepId: 'echon_market_research',
          label: 'ECHON Markt-Research',
          status: 'error',
          error: market.reason ?? 'ECHON Research fehlgeschlagen',
          data: { threadId: market.threadId, runId: market.runId },
        });
      }
    } else if (echonSkippedReason) {
      outcomes.push({
        stepId: 'echon_market_research',
        label: 'ECHON Markt-Research',
        status: 'skipped',
        skipReason: echonSkippedReason,
      });
    }
  }

  const anySuccess = outcomes.some((o) => o.status === 'done');
  const hardFailed = !anySuccess;
  steps = await patchStep('aggregate', {
    status: hardFailed ? 'error' : 'done',
    detail: checkionOnly ? 'CHECKION-Teilcheck (ohne Persona)' : undefined,
  });

  return {
    ok: anySuccess && !hardFailed,
    playbookId: EVENT_QUICK_CHECK_PLAYBOOK_ID,
    playbookLabel: QUICK_CHECK_LABEL,
    projectName,
    url,
    platformProjectId,
    outcomes,
    steps,
    dashboardPath,
    geoQuestions,
    geoQuestionsByPersona,
    geoJob,
    geoJobs,
    domainScan,
    personaPreview,
    audionProjectId,
    audionSetupRequired,
    checkionOnly,
    echonMarket,
    companyBrief,
    geoCompetitors,
    checkionProjectId: checkionProjectId ?? undefined,
    error: hardFailed
      ? 'Pflicht-Schritt fehlgeschlagen'
      : audionSetupRequired && !personaSucceeded
        ? 'CHECKION-Ergebnisse verfügbar — für Persona & persona-GEO AUDION-Projekt einrichten und erneut starten'
        : undefined,
  };
}
