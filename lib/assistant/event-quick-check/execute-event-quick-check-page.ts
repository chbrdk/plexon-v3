import { randomUUID } from 'crypto';
import type { RequestUser } from '@/lib/auth-request-user';
import type { AssistantHandlerContext } from '@/lib/assistant/handlers/context';
import type { AssistantCompleteBody } from '@/lib/assistant/complete-types';
import { enrichWorkflowLayout } from '@/lib/assistant/insights/enrich-workflow-layout';
import { runEventQuickCheck } from '@/lib/assistant/playbooks/run-event-quick-check';
import { buildEventQuickCheckReportModel } from '@/lib/assistant/reports/build-event-quick-check-report-model';
import { resolveEventQuickCheckReportLayout } from '@/lib/assistant/reports/build-event-quick-check-report-block';
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types';
import {
  EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY,
  EVENT_QUICK_CHECK_COMPANY_BRIEF_KEY,
  EVENT_QUICK_CHECK_COMPANY_BRIEF_CONFIRMED_KEY,
  EVENT_QUICK_CHECK_AWAITING_COMPANY_BRIEF_KEY,
  EVENT_QUICK_CHECK_CHECKPOINT_KEY,
  EVENT_QUICK_CHECK_AWAITING_GEO_QUESTIONS_KEY,
  EVENT_QUICK_CHECK_GEO_QUESTIONS_DRAFT_KEY,
  EVENT_QUICK_CHECK_GEO_QUESTIONS_BY_PERSONA_DRAFT_KEY,
  EVENT_QUICK_CHECK_GEO_COMPETITORS_DRAFT_KEY,
  EVENT_QUICK_CHECK_GEO_QUESTIONS_CONFIRMED_KEY,
  EVENT_QUICK_CHECK_DEPTH_KEY,
  EVENT_QUICK_CHECK_TARGET_GROUP_COUNT_KEY,
  EVENT_QUICK_CHECK_PERSONA_COUNT_KEY,
  EVENT_QUICK_CHECK_SCAN_MAX_PAGES_KEY,
  EVENT_QUICK_CHECK_MAX_COMPETITORS_KEY,
  EVENT_QUICK_CHECK_AWAITING_COMPETITORS_KEY,
  EVENT_QUICK_CHECK_COMPETITORS_DRAFT_KEY,
  EVENT_QUICK_CHECK_COMPETITORS_CONFIRMED_KEY,
  EVENT_QUICK_CHECK_COMPETITORS_CHECKPOINT_KEY,
  EVENT_QUICK_CHECK_DEEP_SCAN_STARTED_KEY,
  EVENT_QUICK_CHECK_AWAITING_DEEP_SCAN_KEY,
  EVENT_QUICK_CHECK_FLOW_STATE_KEY,
} from '@/lib/paths/event-quick-check-page';
import { EVENT_QUICK_CHECK_PLAYBOOK_ID, resolveEventQuickCheckProfile, resolveEventQuickCheckProfileFromStored, type EventQuickCheckDepth } from '@/lib/paths/assistant-workflows';
import { buildEventQuickCheckInitialSteps } from '@/lib/assistant/ui-blocks/event-quick-check-steps';
import {
  createAssistantWorkflowRun,
  getAssistantWorkflowRunById,
  updateAssistantWorkflowRun,
  type WorkflowStep,
} from '@/lib/db/assistant-workflow-runs';
import { createAssistantConversation } from '@/lib/db/assistant-conversations';
import { getProjectBindingIds } from '@/lib/assistant/workflows/create-platform-project';
import { recordAssistantUsageEvent } from '@/lib/assistant/usage';
import type { WorkflowStepEmitter } from '@/lib/assistant/workflows/workflow-step-stream';
import {
  emitWorkflowRunStarted,
  emitWorkflowStepsToStream,
} from '@/lib/assistant/workflows/workflow-step-stream';

import {
  domainFromEventQuickCheckUrl,
  normalizeEventQuickCheckUrl,
} from '@/lib/assistant/event-quick-check/event-quick-check-url';
import { quickCheckReportTitle, QUICK_CHECK_LABEL } from '@/lib/assistant/event-quick-check/quick-check-label';
import { resolveEventQuickCheckDeepScanStatus } from '@/lib/assistant/event-quick-check/deep-scan-run-status';
import type { EventQuickCheckCompanyBrief } from '@/lib/assistant/event-quick-check/company-brief-types';
import type { EventQuickCheckResumeCheckpoint, EventQuickCheckCompetitorsCheckpoint } from '@/lib/assistant/event-quick-check/event-quick-check-checkpoint';
import type { PersonaGeoQuestionGroup } from '@/lib/assistant/geo/build-persona-geo-questions';
import type { EventQuickCheckRunMode } from '@/lib/assistant/playbooks/run-event-quick-check';
import type { EventQuickCheckResult } from '@/lib/assistant/playbooks/run-event-quick-check';
import type { CheckionProjectDeepScanStarted } from '@/lib/integrations/checkion-project-deep-scan-client';
import { resolveDeepScanForQuickCheck } from '@/lib/assistant/event-quick-check/resolve-deep-scan-for-quick-check';
import { listPersonasFromPreview } from '@/lib/assistant/event-quick-check/persona-bootstrap-preview';
import { userCanAccessEventQuickCheckRun } from '@/lib/assistant/event-quick-check/authorize-event-quick-check-run';
import { updateAssistantConversation } from '@/lib/db/assistant-conversations';

export { domainFromEventQuickCheckUrl, normalizeEventQuickCheckUrl };

async function syncEqcConversationPlatformProject(
  conversationId: string,
  platformProjectId: string | undefined | null
): Promise<void> {
  const id = platformProjectId?.trim();
  if (!id) return;
  await updateAssistantConversation(conversationId, { platformProjectId: id });
}

export type CreateEventQuickCheckRunInput = {
  user: RequestUser;
  url: string;
  projectName?: string;
  platformProjectId?: string;
  depth?: EventQuickCheckDepth;
  scanMaxPages?: number;
  targetGroupCount?: number;
  personaCount?: number;
  maxCompetitors?: number;
};

export type CreateEventQuickCheckRunResult = {
  workflowRunId: string;
  conversationId: string;
  url: string;
  projectName: string;
};

export type ExecuteEventQuickCheckRunInput = {
  user: RequestUser;
  workflowRunId: string;
  emit?: WorkflowStepEmitter;
  /** Set when resuming after user confirmed company brief. */
  companyBriefConfirmed?: EventQuickCheckCompanyBrief;
  geoQuestionsConfirmed?: string[];
  geoCompetitorsConfirmed?: string[];
  competitorsConfirmed?: string[];
  /** Resume Komplettscan after CHECKION deep scans finished. */
  continueAfterDeepScan?: boolean;
};

export type ExecuteEventQuickCheckRunResult = {
  ok: boolean;
  workflowRunId: string;
  report?: EventQuickCheckReportModel;
  steps: WorkflowStep[];
  platformProjectId?: string;
  error?: string;
  awaitingCompanyBrief?: boolean;
  companyBrief?: EventQuickCheckCompanyBrief;
  awaitingGeoQuestions?: boolean;
  geoQuestions?: string[];
  geoQuestionsByPersona?: PersonaGeoQuestionGroup[];
  /** True when AUDION persona(s) exist for this GEO draft. */
  geoHasPersona?: boolean;
  geoCompetitors?: string[];
  awaitingCompetitors?: boolean;
  competitors?: string[];
  maxCompetitors?: number;
  awaitingDeepScan?: boolean;
  deepScanProgress?: { complete: number; total: number; detail: string };
  checkionProjectId?: string;
};

function resolveEventQuickCheckDepth(stored: Record<string, unknown>): EventQuickCheckDepth {
  return stored[EVENT_QUICK_CHECK_DEPTH_KEY] === 'complete' ? 'complete' : 'quick';
}

function resolveEventQuickCheckRunMode(
  stored: Record<string, unknown>,
  input: ExecuteEventQuickCheckRunInput,
  confirmedBrief?: EventQuickCheckCompanyBrief
): EventQuickCheckRunMode {
  if (input.continueAfterDeepScan && stored[EVENT_QUICK_CHECK_CHECKPOINT_KEY]) {
    return 'after_geo';
  }
  const geoConfirmed =
    input.geoQuestionsConfirmed ??
    (stored[EVENT_QUICK_CHECK_GEO_QUESTIONS_CONFIRMED_KEY] as string[] | undefined);
  if (geoConfirmed?.length && stored[EVENT_QUICK_CHECK_CHECKPOINT_KEY]) {
    return 'after_geo';
  }
  const competitorsConfirmed =
    input.competitorsConfirmed ??
    (stored[EVENT_QUICK_CHECK_COMPETITORS_CONFIRMED_KEY] as string[] | undefined);
  if (
    competitorsConfirmed?.length &&
    stored[EVENT_QUICK_CHECK_COMPETITORS_CHECKPOINT_KEY]
  ) {
    return 'continue_after_competitors';
  }
  if (confirmedBrief) {
    return 'continue_after_brief';
  }
  return 'company_research_only';
}

function buildMinimalEnrichContext(input: {
  user: RequestUser;
  conversationId: string;
  platformProjectId?: string;
  bindingIds: AssistantHandlerContext['bindingIds'];
  emit?: WorkflowStepEmitter;
}): AssistantHandlerContext {
  const body = { prompt: '' } as AssistantCompleteBody;
  return {
    user: input.user,
    body,
    conversationId: input.conversationId,
    conversation: {
      id: input.conversationId,
      userId: input.user.id,
      platformProjectId: input.platformProjectId ?? null,
      title: null,
    },
    platformProjectId: input.platformProjectId,
    bindingIds: input.bindingIds,
    history: [],
    prompt: '',
    profile: { name: null, email: '' },
    emit: input.emit,
    resolvedName: (name) => name?.trim() || undefined,
    resolvedDomain: (domain) => domain?.trim() || undefined,
  };
}

export async function createEventQuickCheckRun(
  input: CreateEventQuickCheckRunInput
): Promise<CreateEventQuickCheckRunResult> {
  const url = normalizeEventQuickCheckUrl(input.url);
  const domain = domainFromEventQuickCheckUrl(url);
  if (!domain) {
    throw new Error('INVALID_URL');
  }

  const projectName = input.projectName?.trim() || domain;
  const depth = input.depth ?? 'quick';
  const profile = resolveEventQuickCheckProfile(depth, {
    scanMaxPages: input.scanMaxPages,
    targetGroupCount: input.targetGroupCount,
    personaCount: input.personaCount,
    maxCompetitors: input.maxCompetitors,
  });
  const conversationId = randomUUID();
  const workflowRunId = randomUUID();

  await createAssistantConversation({
    id: conversationId,
    userId: input.user.id,
    title: quickCheckReportTitle(domain),
    platformProjectId: input.platformProjectId ?? null,
  });

  await createAssistantWorkflowRun({
    id: workflowRunId,
    conversationId,
    userId: input.user.id,
    type: 'event_quick_check',
    steps: buildEventQuickCheckInitialSteps(depth),
  });

  await updateAssistantWorkflowRun(workflowRunId, {
    status: 'running',
    result: {
      url,
      projectName,
      [EVENT_QUICK_CHECK_DEPTH_KEY]: depth,
      [EVENT_QUICK_CHECK_SCAN_MAX_PAGES_KEY]: profile.scanMaxPages,
      [EVENT_QUICK_CHECK_TARGET_GROUP_COUNT_KEY]: profile.targetGroupCount,
      [EVENT_QUICK_CHECK_PERSONA_COUNT_KEY]: profile.personaCount,
      [EVENT_QUICK_CHECK_MAX_COMPETITORS_KEY]: profile.maxCompetitors,
      ...(input.platformProjectId ? { platformProjectId: input.platformProjectId } : {}),
    },
  });

  return { workflowRunId, conversationId, url, projectName };
}


export async function executeEventQuickCheckRun(
  input: ExecuteEventQuickCheckRunInput
): Promise<ExecuteEventQuickCheckRunResult> {
  const run = await getAssistantWorkflowRunById(input.workflowRunId);
  if (!run || !(await userCanAccessEventQuickCheckRun(input.user, run))) {
    throw new Error('NOT_FOUND');
  }
  if (run.type !== 'event_quick_check') {
    throw new Error('INVALID_RUN');
  }

  const stored = run.result ?? {};
  const url = typeof stored.url === 'string' ? stored.url : undefined;
  const projectName = typeof stored.projectName === 'string' ? stored.projectName : undefined;
  if (!url || !projectName) {
    throw new Error('RUN_NOT_INITIALIZED');
  }

  if (stored[EVENT_QUICK_CHECK_AWAITING_COMPANY_BRIEF_KEY] && !input.companyBriefConfirmed) {
    return {
      ok: true,
      workflowRunId: run.id,
      steps: run.steps,
      awaitingCompanyBrief: true,
      companyBrief: stored[EVENT_QUICK_CHECK_COMPANY_BRIEF_KEY] as EventQuickCheckCompanyBrief,
    };
  }

  if (stored[EVENT_QUICK_CHECK_AWAITING_GEO_QUESTIONS_KEY] && !input.geoQuestionsConfirmed) {
    const deepScan = await resolveEventQuickCheckDeepScanStatus(stored);
    const awaitingCheckpoint = stored[EVENT_QUICK_CHECK_CHECKPOINT_KEY] as
      | EventQuickCheckResumeCheckpoint
      | undefined;
    return {
      ok: true,
      workflowRunId: run.id,
      steps: run.steps,
      awaitingGeoQuestions: true,
      geoQuestions: stored[EVENT_QUICK_CHECK_GEO_QUESTIONS_DRAFT_KEY] as string[],
      geoQuestionsByPersona: stored[EVENT_QUICK_CHECK_GEO_QUESTIONS_BY_PERSONA_DRAFT_KEY] as
        | PersonaGeoQuestionGroup[]
        | undefined,
      geoHasPersona: listPersonasFromPreview(awaitingCheckpoint?.personaPreview).length > 0,
      geoCompetitors: stored[EVENT_QUICK_CHECK_GEO_COMPETITORS_DRAFT_KEY] as string[] | undefined,
      companyBrief: stored[EVENT_QUICK_CHECK_COMPANY_BRIEF_CONFIRMED_KEY] as
        | EventQuickCheckCompanyBrief
        | undefined,
      ...(deepScan.deepScanStarted
        ? {
            deepScanProgress: deepScan.deepScanProgress,
            checkionProjectId: deepScan.checkionProjectId,
          }
        : {}),
    };
  }

  if (run.status === 'completed' && stored[EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY]) {
    const { hydrateEventQuickCheckReportDomainPages, resolveEqcDomainScanIdFromStored } =
      await import('@/lib/assistant/event-quick-check/hydrate-domain-scan-page-count');
    const report = await hydrateEventQuickCheckReportDomainPages(
      stored[EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY] as EventQuickCheckReportModel,
      resolveEqcDomainScanIdFromStored(stored as Record<string, unknown>)
    );
    return {
      ok: true,
      workflowRunId: run.id,
      report,
      steps: run.steps,
      platformProjectId:
        typeof stored.platformProjectId === 'string' ? stored.platformProjectId : undefined,
    };
  }

  if (
    stored[EVENT_QUICK_CHECK_AWAITING_DEEP_SCAN_KEY] &&
    !input.continueAfterDeepScan &&
    !input.geoQuestionsConfirmed
  ) {
    const started = stored[EVENT_QUICK_CHECK_DEEP_SCAN_STARTED_KEY] as
      | CheckionProjectDeepScanStarted
      | undefined;
    const resolved = started ? await resolveDeepScanForQuickCheck(started) : null;
    return {
      ok: true,
      workflowRunId: run.id,
      steps: run.steps,
      awaitingDeepScan: true,
      deepScanProgress: resolved?.progress,
      checkionProjectId:
        (stored[EVENT_QUICK_CHECK_CHECKPOINT_KEY] as EventQuickCheckResumeCheckpoint | undefined)
          ?.checkionProjectId ?? undefined,
    };
  }

  if (stored[EVENT_QUICK_CHECK_AWAITING_COMPETITORS_KEY] && !input.competitorsConfirmed) {
    const profile = resolveEventQuickCheckProfileFromStored(stored);
    return {
      ok: true,
      workflowRunId: run.id,
      steps: run.steps,
      awaitingCompetitors: true,
      competitors: stored[EVENT_QUICK_CHECK_COMPETITORS_DRAFT_KEY] as string[],
      maxCompetitors: profile.maxCompetitors,
      companyBrief: stored[EVENT_QUICK_CHECK_COMPANY_BRIEF_CONFIRMED_KEY] as
        | EventQuickCheckCompanyBrief
        | undefined,
    };
  }

  emitWorkflowRunStarted(input.emit, run.id, 'event_quick_check');
  emitWorkflowStepsToStream(input.emit, run.steps, 'event_quick_check', QUICK_CHECK_LABEL);

  const platformProjectId =
    typeof stored.platformProjectId === 'string' ? stored.platformProjectId : undefined;

  await syncEqcConversationPlatformProject(run.conversationId, platformProjectId);

  const bindingIds = platformProjectId ? await getProjectBindingIds(platformProjectId) : null;

  const ctx = buildMinimalEnrichContext({
    user: input.user,
    conversationId: run.conversationId,
    platformProjectId,
    bindingIds,
    emit: input.emit,
  });

  const confirmedBrief =
    input.companyBriefConfirmed ??
    (stored[EVENT_QUICK_CHECK_COMPANY_BRIEF_CONFIRMED_KEY] as EventQuickCheckCompanyBrief | undefined);

  const confirmedGeoQuestions =
    input.geoQuestionsConfirmed ??
    (stored[EVENT_QUICK_CHECK_GEO_QUESTIONS_CONFIRMED_KEY] as string[] | undefined);

  const runMode = resolveEventQuickCheckRunMode(stored, input, confirmedBrief);

  const checkpoint = stored[EVENT_QUICK_CHECK_CHECKPOINT_KEY] as
    | EventQuickCheckResumeCheckpoint
    | undefined;

  const competitorsCheckpoint = stored[EVENT_QUICK_CHECK_COMPETITORS_CHECKPOINT_KEY] as
    | EventQuickCheckCompetitorsCheckpoint
    | undefined;
  const confirmedCompetitors =
    input.competitorsConfirmed ??
    (stored[EVENT_QUICK_CHECK_COMPETITORS_CONFIRMED_KEY] as string[] | undefined);

  const profile = resolveEventQuickCheckProfileFromStored(stored);

  const quick = await runEventQuickCheck(
    {
      user: input.user,
      projectName,
      url,
      platformProjectId,
    },
    {
      workflowRunId: run.id,
      initialSteps: run.steps,
      emit: input.emit,
      companyBrief: confirmedBrief,
      geoQuestions: confirmedGeoQuestions,
      geoQuestionsByPersona: stored[EVENT_QUICK_CHECK_GEO_QUESTIONS_BY_PERSONA_DRAFT_KEY] as
        | PersonaGeoQuestionGroup[]
        | undefined,
      geoCompetitors:
        input.geoCompetitorsConfirmed ??
        (stored[EVENT_QUICK_CHECK_GEO_COMPETITORS_DRAFT_KEY] as string[] | undefined),
      resumeCheckpoint: checkpoint,
      runMode,
      depth: profile.depth,
      profileOverrides: {
        scanMaxPages: profile.scanMaxPages,
        targetGroupCount: profile.targetGroupCount,
        personaCount: profile.personaCount,
        maxCompetitors: profile.maxCompetitors,
      },
      competitorsConfirmed: confirmedCompetitors,
      competitorsCheckpoint,
      eqcFlowState: stored[EVENT_QUICK_CHECK_FLOW_STATE_KEY] as
        | EventQuickCheckResult['eqcFlowState']
        | undefined,
    }
  );

  const steps = quick.steps;
  await syncEqcConversationPlatformProject(
    run.conversationId,
    quick.platformProjectId ?? platformProjectId
  );

  if (quick.awaitingCompanyBriefConfirmation && quick.companyBrief) {
    await updateAssistantWorkflowRun(run.id, {
      status: 'running',
      steps,
      result: {
        ...stored,
        url,
        projectName,
        platformProjectId: quick.platformProjectId ?? platformProjectId,
        [EVENT_QUICK_CHECK_COMPANY_BRIEF_KEY]: quick.companyBrief,
        [EVENT_QUICK_CHECK_AWAITING_COMPANY_BRIEF_KEY]: true,
        ...(quick.eqcFlowState
          ? { [EVENT_QUICK_CHECK_FLOW_STATE_KEY]: quick.eqcFlowState }
          : {}),
      },
    });
    return {
      ok: true,
      workflowRunId: run.id,
      steps,
      awaitingCompanyBrief: true,
      companyBrief: quick.companyBrief,
      platformProjectId: quick.platformProjectId ?? platformProjectId,
    };
  }

  if (quick.awaitingCompetitorsConfirmation) {
    await updateAssistantWorkflowRun(run.id, {
      status: 'running',
      steps,
      result: {
        ...stored,
        url,
        projectName: quick.companyBrief?.displayName ?? projectName,
        platformProjectId: quick.platformProjectId ?? platformProjectId,
        [EVENT_QUICK_CHECK_COMPANY_BRIEF_CONFIRMED_KEY]: quick.companyBrief ?? confirmedBrief,
        [EVENT_QUICK_CHECK_AWAITING_COMPANY_BRIEF_KEY]: false,
        [EVENT_QUICK_CHECK_COMPETITORS_DRAFT_KEY]: quick.competitorsDraft ?? [],
        [EVENT_QUICK_CHECK_COMPETITORS_CHECKPOINT_KEY]: quick.competitorsCheckpoint,
        [EVENT_QUICK_CHECK_AWAITING_COMPETITORS_KEY]: true,
        ...(quick.eqcFlowState
          ? { [EVENT_QUICK_CHECK_FLOW_STATE_KEY]: quick.eqcFlowState }
          : {}),
      },
    });
    return {
      ok: true,
      workflowRunId: run.id,
      steps,
      awaitingCompetitors: true,
      competitors: quick.competitorsDraft ?? [],
      maxCompetitors: resolveEventQuickCheckProfileFromStored(stored).maxCompetitors,
      companyBrief: quick.companyBrief ?? confirmedBrief,
      platformProjectId: quick.platformProjectId ?? platformProjectId,
    };
  }

  if (quick.awaitingDeepScanConfirmation && quick.resumeCheckpoint) {
    const started =
      quick.resumeCheckpoint.deepScanStarted ??
      (stored[EVENT_QUICK_CHECK_DEEP_SCAN_STARTED_KEY] as CheckionProjectDeepScanStarted | undefined);
    await updateAssistantWorkflowRun(run.id, {
      status: 'running',
      steps,
      result: {
        ...stored,
        url,
        projectName: quick.companyBrief?.displayName ?? projectName,
        platformProjectId: quick.platformProjectId ?? platformProjectId,
        [EVENT_QUICK_CHECK_CHECKPOINT_KEY]: quick.resumeCheckpoint,
        [EVENT_QUICK_CHECK_AWAITING_DEEP_SCAN_KEY]: true,
        [EVENT_QUICK_CHECK_DEEP_SCAN_STARTED_KEY]: started,
        [EVENT_QUICK_CHECK_AWAITING_GEO_QUESTIONS_KEY]: false,
        ...(quick.eqcFlowState
          ? { [EVENT_QUICK_CHECK_FLOW_STATE_KEY]: quick.eqcFlowState }
          : {}),
      },
    });
    return {
      ok: true,
      workflowRunId: run.id,
      steps,
      awaitingDeepScan: true,
      deepScanProgress: quick.deepScanProgress,
      checkionProjectId: quick.checkionProjectId ?? quick.resumeCheckpoint.checkionProjectId,
      platformProjectId: quick.platformProjectId ?? platformProjectId,
    };
  }

  if (quick.awaitingGeoQuestionsConfirmation && quick.geoQuestions?.length) {
    await updateAssistantWorkflowRun(run.id, {
      status: 'running',
      steps,
      result: {
        ...stored,
        url,
        projectName: quick.companyBrief?.displayName ?? projectName,
        platformProjectId: quick.platformProjectId ?? platformProjectId,
        [EVENT_QUICK_CHECK_COMPANY_BRIEF_CONFIRMED_KEY]: quick.companyBrief ?? confirmedBrief,
        [EVENT_QUICK_CHECK_AWAITING_COMPANY_BRIEF_KEY]: false,
        [EVENT_QUICK_CHECK_GEO_QUESTIONS_DRAFT_KEY]: quick.geoQuestions,
        [EVENT_QUICK_CHECK_GEO_QUESTIONS_BY_PERSONA_DRAFT_KEY]: quick.geoQuestionsByPersona,
        [EVENT_QUICK_CHECK_GEO_COMPETITORS_DRAFT_KEY]: quick.geoCompetitors ?? [],
        [EVENT_QUICK_CHECK_CHECKPOINT_KEY]: quick.resumeCheckpoint,
        [EVENT_QUICK_CHECK_AWAITING_GEO_QUESTIONS_KEY]: true,
        ...(quick.resumeCheckpoint?.deepScanStarted
          ? {
              [EVENT_QUICK_CHECK_DEEP_SCAN_STARTED_KEY]: quick.resumeCheckpoint.deepScanStarted,
            }
          : {}),
        ...(quick.eqcFlowState
          ? { [EVENT_QUICK_CHECK_FLOW_STATE_KEY]: quick.eqcFlowState }
          : {}),
      },
    });
    const deepScanStarted =
      quick.resumeCheckpoint?.deepScanStarted ??
      (stored[EVENT_QUICK_CHECK_DEEP_SCAN_STARTED_KEY] as CheckionProjectDeepScanStarted | undefined);
    const deepScanResolved = deepScanStarted
      ? await resolveDeepScanForQuickCheck(deepScanStarted)
      : null;
    return {
      ok: true,
      workflowRunId: run.id,
      steps,
      awaitingGeoQuestions: true,
      geoQuestions: quick.geoQuestions,
      geoQuestionsByPersona: quick.geoQuestionsByPersona,
      geoHasPersona: listPersonasFromPreview(quick.personaPreview).length > 0,
      geoCompetitors: quick.geoCompetitors,
      companyBrief: quick.companyBrief ?? confirmedBrief,
      platformProjectId: quick.platformProjectId ?? platformProjectId,
      ...(deepScanStarted
        ? {
            deepScanProgress: quick.deepScanProgress ?? deepScanResolved?.progress,
            checkionProjectId:
              quick.checkionProjectId ?? quick.resumeCheckpoint?.checkionProjectId,
          }
        : {}),
    };
  }

  if (!quick.ok) {
    await updateAssistantWorkflowRun(run.id, {
      status: 'failed',
      steps,
      result: {
        ...stored,
        url,
        projectName: quick.companyBrief?.displayName ?? projectName,
        platformProjectId: quick.platformProjectId ?? platformProjectId,
        error: quick.error ?? 'Analyse fehlgeschlagen',
        ...(stored[EVENT_QUICK_CHECK_CHECKPOINT_KEY]
          ? {
              [EVENT_QUICK_CHECK_CHECKPOINT_KEY]: {
                ...(stored[EVENT_QUICK_CHECK_CHECKPOINT_KEY] as EventQuickCheckResumeCheckpoint),
                personaPreview:
                  quick.personaPreview ??
                  (stored[EVENT_QUICK_CHECK_CHECKPOINT_KEY] as EventQuickCheckResumeCheckpoint)
                    .personaPreview,
                domainScan:
                  quick.domainScan ??
                  (stored[EVENT_QUICK_CHECK_CHECKPOINT_KEY] as EventQuickCheckResumeCheckpoint)
                    .domainScan,
              } satisfies EventQuickCheckResumeCheckpoint,
            }
          : {}),
      },
    });
    return {
      ok: false,
      workflowRunId: run.id,
      steps,
      error: quick.error ?? 'Analyse fehlgeschlagen',
    };
  }

  const quickForReport = {
    ...quick,
    personaPreview: quick.personaPreview ?? checkpoint?.personaPreview,
    geoQuestionsByPersona:
      quick.geoQuestionsByPersona ??
      (stored[EVENT_QUICK_CHECK_GEO_QUESTIONS_BY_PERSONA_DRAFT_KEY] as
        | PersonaGeoQuestionGroup[]
        | undefined),
  };
  const dataLayout = resolveEventQuickCheckReportLayout(quickForReport);
  const enriched = await enrichWorkflowLayout(
    ctx,
    { workflowType: 'event_quick_check', url: quick.url, quick: quickForReport },
    dataLayout
  );

  const reportBlock = enriched.layout.blocks.find((b) => b.type === 'event_quick_check_report');
  const report =
    (reportBlock?.props.report as EventQuickCheckReportModel | undefined) ??
    buildEventQuickCheckReportModel(quickForReport, enriched.narrative);

  const resolvedPlatformProjectId = quick.platformProjectId ?? platformProjectId;
  await syncEqcConversationPlatformProject(run.conversationId, resolvedPlatformProjectId);

  await updateAssistantWorkflowRun(run.id, {
    status: quick.ok ? 'completed' : 'failed',
    steps,
    result: {
      ...stored,
      url,
      projectName: quick.companyBrief?.displayName ?? projectName,
      platformProjectId: resolvedPlatformProjectId,
      outcomes: quick.outcomes.length,
      geoQuestions: quick.geoQuestions?.length ?? 0,
      [EVENT_QUICK_CHECK_COMPANY_BRIEF_CONFIRMED_KEY]: quick.companyBrief ?? confirmedBrief,
      [EVENT_QUICK_CHECK_AWAITING_COMPANY_BRIEF_KEY]: false,
      [EVENT_QUICK_CHECK_AWAITING_COMPETITORS_KEY]: false,
      [EVENT_QUICK_CHECK_AWAITING_GEO_QUESTIONS_KEY]: false,
      [EVENT_QUICK_CHECK_AWAITING_DEEP_SCAN_KEY]: false,
      ...(quick.eqcFlowState
        ? { [EVENT_QUICK_CHECK_FLOW_STATE_KEY]: quick.eqcFlowState }
        : {}),
      [EVENT_QUICK_CHECK_GEO_QUESTIONS_CONFIRMED_KEY]: quick.geoQuestions ?? confirmedGeoQuestions,
      ...(quick.geoQuestionsByPersona?.length
        ? {
            [EVENT_QUICK_CHECK_GEO_QUESTIONS_BY_PERSONA_DRAFT_KEY]: quick.geoQuestionsByPersona,
            [EVENT_QUICK_CHECK_GEO_QUESTIONS_DRAFT_KEY]: quick.geoQuestions,
          }
        : quick.geoQuestions?.length
          ? { [EVENT_QUICK_CHECK_GEO_QUESTIONS_DRAFT_KEY]: quick.geoQuestions }
          : {}),
      ...(stored[EVENT_QUICK_CHECK_CHECKPOINT_KEY]
        ? {
            [EVENT_QUICK_CHECK_CHECKPOINT_KEY]: {
              ...(stored[EVENT_QUICK_CHECK_CHECKPOINT_KEY] as EventQuickCheckResumeCheckpoint),
              domainScan:
                quick.domainScan ??
                (stored[EVENT_QUICK_CHECK_CHECKPOINT_KEY] as EventQuickCheckResumeCheckpoint)
                  .domainScan,
              personaPreview:
                quick.personaPreview ??
                (stored[EVENT_QUICK_CHECK_CHECKPOINT_KEY] as EventQuickCheckResumeCheckpoint)
                  .personaPreview,
              companyBrief:
                quick.companyBrief ??
                (stored[EVENT_QUICK_CHECK_CHECKPOINT_KEY] as EventQuickCheckResumeCheckpoint)
                  .companyBrief,
              geoCompetitors:
                quick.geoCompetitors ??
                (stored[EVENT_QUICK_CHECK_CHECKPOINT_KEY] as EventQuickCheckResumeCheckpoint)
                  .geoCompetitors,
            } satisfies EventQuickCheckResumeCheckpoint,
          }
        : {}),
      [EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY]: report,
    },
  });

  await recordAssistantUsageEvent({
    userId: input.user.id,
    eventType: 'workflow_run',
    rawUnits: {
      workflow: 'event_quick_check',
      playbook: EVENT_QUICK_CHECK_PLAYBOOK_ID,
      source: 'standalone_page',
      stepsCompleted: quick.outcomes.filter((o) => o.status === 'done').length,
    },
  });

  return {
    ok: quick.ok || quick.outcomes.some((o) => o.status === 'done'),
    workflowRunId: run.id,
    report,
    steps,
    platformProjectId: resolvedPlatformProjectId,
    error: quick.error,
  };
}

export function reportFromWorkflowRun(
  run: NonNullable<Awaited<ReturnType<typeof getAssistantWorkflowRunById>>>
): EventQuickCheckReportModel | null {
  const raw = run.result?.[EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY];
  if (!raw || typeof raw !== 'object') return null;
  return raw as EventQuickCheckReportModel;
}
