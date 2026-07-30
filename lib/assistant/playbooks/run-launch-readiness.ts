import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import { updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import type { RequestUser } from '@/lib/auth-request-user';
import { executePlaybookStep, type PlaybookStepPayload } from '@/lib/assistant/playbooks/execute-step';
import { LAUNCH_READINESS_INITIAL_STEPS } from '@/lib/assistant/ui-blocks/launch-readiness-steps';
import {
  createPlatformProjectWorkflow,
  getProjectBindingIds,
} from '@/lib/assistant/workflows/create-platform-project';
import { probeCheckionApiHealth } from '@/lib/integrations/checkion-connectivity';
import { probeAudionApiHealth } from '@/lib/integrations/audion-connectivity';
import { syncPlatformProjectToProducts } from '@/lib/platform-project-sync-service';
import { startCheckionProjectResearch } from '@/lib/integrations/checkion-research-client';
import {
  fetchAudionProjectResearchLatest,
  pollAudionProjectResearch,
  startAudionProjectResearch,
} from '@/lib/integrations/audion-research-client';
import { runPersonaBootstrap } from '@/lib/integrations/audion-persona-bootstrap-client';
import { summarizeProjectWorkflow } from '@/lib/assistant/workflows/summarize-project';
import { pathPlatformProjectDashboard } from '@/lib/constants';

const RESEARCH_POLL_MS = 3000;
const RESEARCH_MAX_MS = 2 * 60 * 1000;

export type LaunchReadinessStepOutcome = {
  stepId: string;
  label: string;
  status: 'done' | 'error' | 'skipped';
  error?: string;
  skipReason?: string;
  payload?: PlaybookStepPayload;
  data?: Record<string, unknown>;
};

export type LaunchReadinessResult = {
  ok: boolean;
  playbookId: 'launch_readiness';
  playbookLabel: string;
  projectName: string;
  url: string;
  platformProjectId?: string;
  outcomes: LaunchReadinessStepOutcome[];
  steps: WorkflowStep[];
  summaryText?: string;
  dashboardPath?: string;
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

function normalizeLaunchUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function domainFromUrl(url: string): string | undefined {
  try {
    return new URL(normalizeLaunchUrl(url)).hostname;
  } catch {
    return undefined;
  }
}

async function runInlineResearch(input: {
  user: RequestUser;
  platformProjectId: string;
  url: string;
}): Promise<Record<string, unknown>> {
  const { checkionProjectId, audionProjectId } = await getProjectBindingIds(input.platformProjectId);
  const seedUrl = normalizeLaunchUrl(input.url);
  const results: Record<string, unknown> = {};

  if (checkionProjectId) {
    const checkion = await startCheckionProjectResearch(checkionProjectId, input.user.id, {
      url: seedUrl,
    });
    if (checkion.ok) {
      results.checkion = checkion.data;
    } else {
      results.checkionError = checkion.error;
    }
  } else {
    results.checkionSkipped = 'Kein CHECKION-Projekt';
  }

  if (audionProjectId) {
    const started = await startAudionProjectResearch(audionProjectId, input.user.id, {
      seedUrl,
    });
    if (!started.ok || !started.runId) {
      results.audionError = started.error ?? 'Start fehlgeschlagen';
    } else {
      const deadline = Date.now() + RESEARCH_MAX_MS;
      let finished = false;
      while (Date.now() < deadline) {
        const poll = await pollAudionProjectResearch(audionProjectId, started.runId, input.user.id);
        if (!poll.ok) {
          results.audionError = poll.error;
          finished = true;
          break;
        }
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

export async function runLaunchReadiness(
  input: {
    user: RequestUser;
    projectName: string;
    url: string;
    platformProjectId?: string | null;
  },
  options: { workflowRunId?: string; initialSteps?: WorkflowStep[] } = {}
): Promise<LaunchReadinessResult> {
  const runId = options.workflowRunId;
  let steps = options.initialSteps ?? [...LAUNCH_READINESS_INITIAL_STEPS];
  const outcomes: LaunchReadinessStepOutcome[] = [];
  const url = normalizeLaunchUrl(input.url);
  const projectName = input.projectName.trim() || 'Neues Projekt';
  let platformProjectId = input.platformProjectId?.trim() || undefined;
  let summaryText: string | undefined;
  let dashboardPath: string | undefined;
  let criticalFailed = false;

  steps = await setStep(runId, steps, 'prepare', { status: 'running' });
  if (!url) {
    steps = await setStep(runId, steps, 'prepare', { status: 'error', detail: 'URL fehlt' });
    return {
      ok: false,
      playbookId: 'launch_readiness',
      playbookLabel: 'Launch Readiness',
      projectName,
      url: input.url,
      outcomes,
      steps,
      error: 'URL fehlt',
    };
  }
  steps = await setStep(runId, steps, 'prepare', { status: 'done', detail: projectName });

  if (platformProjectId) {
    steps = await setStep(runId, steps, 'create_project', {
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
    steps = await setStep(runId, steps, 'create_project', { status: 'running' });
    const created = await createPlatformProjectWorkflow(
      input.user,
      { name: projectName, domain: domainFromUrl(url), syncProducts: true },
      {}
    );
    if (!created.result.ok || !created.result.platformProjectId) {
      steps = await setStep(runId, steps, 'create_project', {
        status: 'error',
        detail: created.result.error,
      });
      outcomes.push({
        stepId: 'create_project',
        label: 'Plattform-Projekt',
        status: 'error',
        error: created.result.error ?? 'Anlage fehlgeschlagen',
      });
      criticalFailed = true;
    } else {
      platformProjectId = created.result.platformProjectId;
      dashboardPath = created.result.dashboardPath;
      steps = await setStep(runId, steps, 'create_project', {
        status: 'done',
        detail: platformProjectId,
      });
      outcomes.push({
        stepId: 'create_project',
        label: 'Plattform-Projekt',
        status: 'done',
        data: { platformProjectId, syncResults: created.result.syncResults },
      });
    }
  }

  if (!criticalFailed && platformProjectId) {
    steps = await setStep(runId, steps, 'sync_diagnose', { status: 'running' });
    const bindings = await getProjectBindingIds(platformProjectId);
    const [checkionProbe, audionProbe] = await Promise.all([
      probeCheckionApiHealth(),
      probeAudionApiHealth(),
    ]);

    if (!checkionProbe.ok && !audionProbe.ok) {
      steps = await setStep(runId, steps, 'sync_diagnose', {
        status: 'error',
        detail: 'CHECKION und AUDION nicht erreichbar',
      });
      outcomes.push({
        stepId: 'sync_diagnose',
        label: 'Sync & Konnektivität',
        status: 'error',
        error: 'Produkte nicht erreichbar',
        data: { checkionProbe, audionProbe, bindings },
      });
    } else {
      if (!bindings.checkionProjectId || !bindings.audionProjectId) {
        try {
          await syncPlatformProjectToProducts(platformProjectId, { source: 'plexon-assistant-launch' });
        } catch {
          /* retry best-effort */
        }
      }
      const refreshed = await getProjectBindingIds(platformProjectId);
      steps = await setStep(runId, steps, 'sync_diagnose', {
        status: 'done',
        detail: [
          checkionProbe.ok ? 'CHECKION ✓' : 'CHECKION ✗',
          audionProbe.ok ? 'AUDION ✓' : 'AUDION ✗',
        ].join(' · '),
      });
      outcomes.push({
        stepId: 'sync_diagnose',
        label: 'Sync & Konnektivität',
        status: 'done',
        data: { checkionProbe, audionProbe, bindings: refreshed },
      });
    }

    steps = await setStep(runId, steps, 'parallel_research', { status: 'running' });
    const research = await runInlineResearch({
      user: input.user,
      platformProjectId,
      url,
    });
    const researchFailed = Boolean(research.checkionError || research.audionError);
    steps = await setStep(runId, steps, 'parallel_research', {
      status: researchFailed ? 'error' : 'done',
      detail: researchFailed ? 'Teilweise fehlgeschlagen' : 'Gestartet',
    });
    outcomes.push({
      stepId: 'parallel_research',
      label: 'Research',
      status: researchFailed ? 'error' : 'done',
      data: research,
      ...(researchFailed ? { error: String(research.audionError ?? research.checkionError ?? 'Fehler') } : {}),
    });

    const playbookCtx = {
      url,
      userId: input.user.id,
      platformProjectId,
      checkionProjectId: (await getProjectBindingIds(platformProjectId)).checkionProjectId,
      includeGeo: false,
    };

    const auditSteps: Array<{ id: string; kind: 'pagespeed_check' | 'quick_scan' | 'ssl_check'; label: string }> =
      [
        { id: 'audit_pagespeed', kind: 'pagespeed_check', label: 'PageSpeed' },
        { id: 'audit_quick_scan', kind: 'quick_scan', label: 'Accessibility-Scan' },
        { id: 'audit_ssl', kind: 'ssl_check', label: 'SSL-Check' },
      ];

    for (const audit of auditSteps) {
      steps = await setStep(runId, steps, audit.id, { status: 'running', progress: 10 });
      const result = await executePlaybookStep(audit.kind, playbookCtx);
      if ('skipped' in result && result.skipped) {
        steps = await setStep(runId, steps, audit.id, { status: 'done', detail: result.reason });
        outcomes.push({
          stepId: audit.id,
          label: audit.label,
          status: 'skipped',
          skipReason: result.reason,
        });
        continue;
      }
      if (!result.ok) {
        steps = await setStep(runId, steps, audit.id, {
          status: audit.kind === 'ssl_check' ? 'error' : 'error',
          detail: result.error,
        });
        outcomes.push({
          stepId: audit.id,
          label: audit.label,
          status: 'error',
          error: result.error,
        });
        if (audit.kind !== 'ssl_check') criticalFailed = true;
        continue;
      }
      if ('payload' in result) {
        steps = await setStep(runId, steps, audit.id, { status: 'done', progress: 100 });
        outcomes.push({
          stepId: audit.id,
          label: audit.label,
          status: 'done',
          payload: result.payload,
        });
      }
    }

    const { audionProjectId } = await getProjectBindingIds(platformProjectId);
    steps = await setStep(runId, steps, 'persona_bootstrap', { status: 'running' });
    if (!audionProjectId) {
      steps = await setStep(runId, steps, 'persona_bootstrap', {
        status: 'done',
        detail: 'Kein AUDION-Binding',
      });
      outcomes.push({
        stepId: 'persona_bootstrap',
        label: 'Persona-Bootstrap',
        status: 'skipped',
        skipReason: 'Kein AUDION-Projekt',
      });
    } else {
      const persona = await runPersonaBootstrap({
        projectName,
        existingAudionProjectId: audionProjectId,
      });
      if (!persona.ok) {
        steps = await setStep(runId, steps, 'persona_bootstrap', { status: 'error', detail: persona.error });
        outcomes.push({
          stepId: 'persona_bootstrap',
          label: 'Persona-Bootstrap',
          status: 'error',
          error: persona.error,
        });
      } else {
        steps = await setStep(runId, steps, 'persona_bootstrap', { status: 'done' });
        outcomes.push({
          stepId: 'persona_bootstrap',
          label: 'Persona-Bootstrap',
          status: 'done',
          data: { preview: persona.preview },
        });
      }
    }

    steps = await setStep(runId, steps, 'project_summary', { status: 'running' });
    const summary = await summarizeProjectWorkflow(input.user, platformProjectId);
    if (!summary.ok) {
      steps = await setStep(runId, steps, 'project_summary', { status: 'error', detail: summary.error });
      outcomes.push({
        stepId: 'project_summary',
        label: 'Projekt-Zusammenfassung',
        status: 'error',
        error: summary.error,
      });
    } else {
      summaryText = summary.text;
      steps = await setStep(runId, steps, 'project_summary', { status: 'done' });
      outcomes.push({
        stepId: 'project_summary',
        label: 'Projekt-Zusammenfassung',
        status: 'done',
        data: summary.data,
      });
    }
  } else {
    for (const skipId of [
      'sync_diagnose',
      'parallel_research',
      'audit_pagespeed',
      'audit_quick_scan',
      'audit_ssl',
      'persona_bootstrap',
      'project_summary',
    ]) {
      steps = await setStep(runId, steps, skipId, { status: 'done', detail: 'Übersprungen' });
    }
  }

  const anySuccess = outcomes.some((o) => o.status === 'done');
  steps = await setStep(runId, steps, 'aggregate', {
    status: criticalFailed ? 'error' : 'done',
  });

  return {
    ok: !criticalFailed && anySuccess,
    playbookId: 'launch_readiness',
    playbookLabel: 'Launch Readiness',
    projectName,
    url,
    platformProjectId,
    outcomes,
    steps,
    summaryText,
    dashboardPath,
    error: criticalFailed ? 'Pflicht-Schritt fehlgeschlagen' : undefined,
  };
}
