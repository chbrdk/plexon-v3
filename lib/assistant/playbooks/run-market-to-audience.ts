import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import { updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import type { RequestUser } from '@/lib/auth-request-user';
import { summarizeProjectWorkflow } from '@/lib/assistant/workflows/summarize-project';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { getExternalProjectId } from '@/lib/db/platform-project-bindings';
import {
  deriveTargetGroupsFromMarket,
  runEchonPlaybookResearch,
  type EchonMarketContext,
} from '@/lib/integrations/echon-market-context';
import { createAudionTargetGroupsFromSuggestions } from '@/lib/integrations/audion-target-group-client';
import {
  getEchonPlaybookResearchTimeoutMs,
  getEchonResearchPollIntervalMs,
  getEchonResearchPollRequestTimeoutMs,
} from '@/lib/paths/echon-api';

export type MarketToAudienceStepOutcome = {
  stepId: string;
  label: string;
  status: 'done' | 'error' | 'skipped';
  error?: string;
  skipReason?: string;
  data?: Record<string, unknown>;
};

export type MarketToAudienceResult = {
  ok: boolean;
  playbookId: 'market_to_audience';
  playbookLabel: string;
  projectName: string;
  platformProjectId?: string;
  audionProjectId?: string;
  checkionProjectId?: string;
  researchQuery: string;
  outcomes: MarketToAudienceStepOutcome[];
  steps: WorkflowStep[];
  marketSummary?: EchonMarketContext;
  createdTargetGroups: Array<{ id: string; name: string }>;
  errors: string[];
  error?: string;
};

async function setStep(
  runId: string | undefined,
  steps: WorkflowStep[],
  stepId: string,
  patch: Partial<WorkflowStep>
): Promise<WorkflowStep[]> {
  const next = steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s));
  if (runId) {
    await updateAssistantWorkflowRun(runId, { steps: next, status: 'running' });
  }
  return next;
}

export function buildMarketResearchQuery(projectName: string, domain?: string | null): string {
  const parts = [`Markt- und Zielgruppen-Trends für ${projectName}`];
  if (domain?.trim()) parts.push(`Kontext-Domain: ${domain.trim()}`);
  parts.push('Fokus: relevante Segmente und Kundentypen für Marketing/Personas.');
  return parts.join(' ');
}

export async function runMarketToAudience(
  input: {
    user: RequestUser;
    projectName: string;
    platformProjectId?: string | null;
    audionProjectId?: string | null;
    checkionProjectId?: string | null;
    researchQuery?: string;
    maxTargetGroups?: number;
  },
  options: { workflowRunId?: string; initialSteps?: WorkflowStep[] } = {}
): Promise<MarketToAudienceResult> {
  const runId = options.workflowRunId;
  let steps = options.initialSteps ?? [];
  const outcomes: MarketToAudienceStepOutcome[] = [];
  const errors: string[] = [];
  const createdTargetGroups: Array<{ id: string; name: string }> = [];
  const projectName = input.projectName.trim() || 'Projekt';
  const maxTargetGroups = Math.min(3, Math.max(1, input.maxTargetGroups ?? 2));

  let platformProjectId = input.platformProjectId?.trim() || undefined;
  let audionProjectId = input.audionProjectId?.trim() || undefined;
  let checkionProjectId = input.checkionProjectId?.trim() || undefined;
  let domain: string | null | undefined;

  steps = await setStep(runId, steps, 'prepare', { status: 'running' });

  if (platformProjectId) {
    const project = await getPlatformProjectById(platformProjectId);
    domain = project?.domain ?? undefined;
    if (!audionProjectId || !checkionProjectId) {
      audionProjectId =
        audionProjectId ?? (await getExternalProjectId(platformProjectId, 'audion')) ?? undefined;
      checkionProjectId =
        checkionProjectId ?? (await getExternalProjectId(platformProjectId, 'checkion')) ?? undefined;
    }
  }

  if (!audionProjectId) {
    steps = await setStep(runId, steps, 'prepare', {
      status: 'error',
      detail: 'audionProjectId fehlt',
    });
    return {
      ok: false,
      playbookId: 'market_to_audience',
      playbookLabel: 'Markt → Zielgruppen',
      projectName,
      platformProjectId,
      researchQuery: '',
      outcomes,
      steps,
      createdTargetGroups,
      errors,
      error: 'AUDION-Projekt fehlt — Playbook benötigt audionProjectId (Projektkontext oder Binding).',
    };
  }

  const researchQuery =
    input.researchQuery?.trim() || buildMarketResearchQuery(projectName, domain ?? undefined);

  steps = await setStep(runId, steps, 'prepare', {
    status: 'done',
    detail: researchQuery.slice(0, 80),
  });
  outcomes.push({
    stepId: 'prepare',
    label: 'Vorbereitung',
    status: 'done',
    data: { audionProjectId, checkionProjectId, researchQuery },
  });

  steps = await setStep(runId, steps, 'checkion_context', { status: 'running' });
  if (platformProjectId) {
    const summary = await summarizeProjectWorkflow(input.user, platformProjectId);
    if (summary.ok) {
      steps = await setStep(runId, steps, 'checkion_context', {
        status: 'done',
        detail: 'Projekt-Kurzinfo geladen',
      });
      outcomes.push({
        stepId: 'checkion_context',
        label: 'CHECKION-Kontext',
        status: 'done',
        data: { hasSummary: true },
      });
    } else {
      steps = await setStep(runId, steps, 'checkion_context', {
        status: 'done',
        detail: summary.error ?? 'übersprungen',
      });
      outcomes.push({
        stepId: 'checkion_context',
        label: 'CHECKION-Kontext',
        status: 'skipped',
        skipReason: summary.error,
      });
    }
  } else {
    steps = await setStep(runId, steps, 'checkion_context', {
      status: 'done',
      detail: 'Kein Plattform-Projekt',
    });
    outcomes.push({
      stepId: 'checkion_context',
      label: 'CHECKION-Kontext',
      status: 'skipped',
      skipReason: 'Kein platformProjectId',
    });
  }

  steps = await setStep(runId, steps, 'echon_research', { status: 'running' });
  let marketSummary: EchonMarketContext | undefined;
  try {
    const market = await runEchonPlaybookResearch(researchQuery, {
      timeoutMs: getEchonPlaybookResearchTimeoutMs(),
      pollIntervalMs: getEchonResearchPollIntervalMs(),
      pollRequestTimeoutMs: getEchonResearchPollRequestTimeoutMs(),
      onPoll: async (attempt, threadId) => {
        steps = await setStep(runId, steps, 'echon_research', {
          status: 'running',
          detail: `Poll ${attempt} · ${threadId.slice(0, 8)}…`,
        });
      },
    });
    marketSummary = market;
    if (market.available) {
      steps = await setStep(runId, steps, 'echon_research', {
        status: 'done',
        detail: `${market.keyFindings?.length ?? 0} Findings`,
      });
      outcomes.push({
        stepId: 'echon_research',
        label: 'ECHON Markt-Research',
        status: 'done',
        data: { threadId: market.threadId, runId: market.runId },
      });
    } else {
      const reason = market.reason ?? 'echon_research_failed';
      errors.push(`ECHON Research: ${reason}`);
      steps = await setStep(runId, steps, 'echon_research', {
        status: 'error',
        detail: reason,
      });
      outcomes.push({
        stepId: 'echon_research',
        label: 'ECHON Markt-Research',
        status: 'error',
        error: reason,
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`ECHON Research: ${msg}`);
    steps = await setStep(runId, steps, 'echon_research', { status: 'error', detail: msg });
    outcomes.push({
      stepId: 'echon_research',
      label: 'ECHON Markt-Research',
      status: 'error',
      error: msg,
    });
  }

  steps = await setStep(runId, steps, 'audion_target_groups', { status: 'running' });
  const suggestions = marketSummary?.available
    ? deriveTargetGroupsFromMarket(marketSummary, projectName, maxTargetGroups)
    : [];

  if (suggestions.length === 0) {
    const msg = marketSummary?.available
      ? 'Keine Zielgruppen-Vorschläge aus Markt-Research'
      : 'Zielgruppen übersprungen — ECHON Research nicht verfügbar';
    errors.push(msg);
    steps = await setStep(runId, steps, 'audion_target_groups', {
      status: marketSummary?.available ? 'error' : 'done',
      detail: msg,
    });
    outcomes.push({
      stepId: 'audion_target_groups',
      label: 'AUDION Zielgruppen',
      status: marketSummary?.available ? 'error' : 'skipped',
      skipReason: marketSummary?.available ? undefined : msg,
      error: marketSummary?.available ? msg : undefined,
    });
  } else {
    const created = await createAudionTargetGroupsFromSuggestions({
      audionProjectId,
      suggestions,
    });
    createdTargetGroups.push(...created.created);
    errors.push(...created.errors);

    if (created.created.length > 0) {
      steps = await setStep(runId, steps, 'audion_target_groups', {
        status: created.errors.length ? 'done' : 'done',
        detail: `${created.created.length} angelegt`,
      });
      outcomes.push({
        stepId: 'audion_target_groups',
        label: 'AUDION Zielgruppen',
        status: 'done',
        data: { count: created.created.length, ids: created.created.map((c) => c.id) },
      });
    } else {
      steps = await setStep(runId, steps, 'audion_target_groups', {
        status: 'error',
        detail: created.errors[0] ?? 'Anlage fehlgeschlagen',
      });
      outcomes.push({
        stepId: 'audion_target_groups',
        label: 'AUDION Zielgruppen',
        status: 'error',
        error: created.errors.join('; ') || 'Anlage fehlgeschlagen',
      });
    }
  }

  const ok =
    outcomes.some((o) => o.stepId === 'echon_research' && o.status === 'done') &&
    createdTargetGroups.length > 0;

  return {
    ok,
    playbookId: 'market_to_audience',
    playbookLabel: 'Markt → Zielgruppen',
    projectName,
    platformProjectId,
    audionProjectId,
    checkionProjectId,
    researchQuery,
    outcomes,
    steps,
    marketSummary,
    createdTargetGroups,
    errors,
    error: ok ? undefined : errors[0] ?? 'Playbook unvollständig',
  };
}
