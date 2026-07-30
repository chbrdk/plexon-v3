import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import { updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import { executePlaybookStep, type PlaybookStepPayload } from '@/lib/assistant/playbooks/execute-step';
import { getPlaybook } from '@/lib/assistant/playbooks/registry';
import type { PlaybookContext, PlaybookStepDefinition, PlaybookStepKind } from '@/lib/assistant/playbooks/types';

export type PlaybookStepOutcome = {
  stepId: string;
  kind: PlaybookStepKind;
  label: string;
  status: 'done' | 'error' | 'skipped';
  error?: string;
  skipReason?: string;
  payload?: PlaybookStepPayload;
};

export type PlaybookRunResult = {
  ok: boolean;
  playbookId: string;
  playbookLabel: string;
  url: string;
  outcomes: PlaybookStepOutcome[];
  steps: WorkflowStep[];
  error?: string;
  requiredFailed?: boolean;
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

export function playbookToWorkflowSteps(
  stepDefs: PlaybookStepDefinition[],
  options: { skipKinds?: PlaybookStepKind[] } = {}
): WorkflowStep[] {
  const skip = new Set(options.skipKinds ?? []);
  return [
    { id: 'prepare', label: 'Playbook vorbereiten', status: 'pending' as const },
    ...stepDefs
      .filter((s) => !skip.has(s.kind))
      .map((s) => ({ id: s.id, label: s.label, status: 'pending' as const })),
    { id: 'aggregate', label: 'Report erstellen', status: 'pending' as const },
  ];
}

function shouldSkipStepDef(
  def: PlaybookStepDefinition,
  ctx: PlaybookContext,
  options: { skipKinds?: PlaybookStepKind[] }
): boolean {
  const skipKinds = options.skipKinds ?? [];
  if (skipKinds.includes(def.kind)) return true;
  if (def.kind === 'geo_analysis' && ctx.includeGeo === false) return true;
  if (def.kind === 'contrast_check' && !ctx.contrast) return true;
  return false;
}

export async function runPlaybook(
  input: {
    playbookId: string;
    url: string;
    context: PlaybookContext;
    skipKinds?: PlaybookStepKind[];
  },
  options: { workflowRunId?: string; initialSteps?: WorkflowStep[] } = {}
): Promise<PlaybookRunResult> {
  const def = getPlaybook(input.playbookId);
  if (!def) {
    return {
      ok: false,
      playbookId: input.playbookId,
      playbookLabel: input.playbookId,
      url: input.url,
      outcomes: [],
      steps: options.initialSteps ?? [],
      error: `Playbook nicht gefunden: ${input.playbookId}`,
    };
  }

  const activeSteps = def.steps.filter((s) => !shouldSkipStepDef(s, input.context, input));
  let steps =
    options.initialSteps ??
    playbookToWorkflowSteps(def.steps, { skipKinds: input.skipKinds });

  const runId = options.workflowRunId;
  const outcomes: PlaybookStepOutcome[] = [];
  let requiredFailed = false;

  steps = await setStep(runId, steps, 'prepare', { status: 'running' });
  if (!input.url.trim()) {
    steps = await setStep(runId, steps, 'prepare', { status: 'error', detail: 'URL fehlt' });
    return {
      ok: false,
      playbookId: def.id,
      playbookLabel: def.label,
      url: input.url,
      outcomes,
      steps,
      error: 'URL fehlt',
      requiredFailed: true,
    };
  }
  steps = await setStep(runId, steps, 'prepare', { status: 'done' });

  for (const stepDef of activeSteps) {
    steps = await setStep(runId, steps, stepDef.id, { status: 'running', progress: 5 });
    const result = await executePlaybookStep(stepDef.kind, { ...input.context, url: input.url }, {
      timeoutMs: stepDef.timeoutMs,
    });

    if ('skipped' in result && result.skipped) {
      steps = await setStep(runId, steps, stepDef.id, {
        status: 'done',
        detail: result.reason,
      });
      outcomes.push({
        stepId: stepDef.id,
        kind: stepDef.kind,
        label: stepDef.label,
        status: 'skipped',
        skipReason: result.reason,
      });
      continue;
    }

    if (!result.ok) {
      steps = await setStep(runId, steps, stepDef.id, { status: 'error', detail: result.error });
      outcomes.push({
        stepId: stepDef.id,
        kind: stepDef.kind,
        label: stepDef.label,
        status: 'error',
        error: result.error,
      });
      if (!stepDef.optional) {
        requiredFailed = true;
        break;
      }
      continue;
    }

    if ('payload' in result) {
      steps = await setStep(runId, steps, stepDef.id, { status: 'done', progress: 100 });
      outcomes.push({
        stepId: stepDef.id,
        kind: stepDef.kind,
        label: stepDef.label,
        status: 'done',
        payload: result.payload,
      });
    }
  }

  steps = await setStep(runId, steps, 'aggregate', {
    status: requiredFailed ? 'error' : 'done',
  });

  const anySuccess = outcomes.some((o) => o.status === 'done');
  return {
    ok: !requiredFailed && anySuccess,
    playbookId: def.id,
    playbookLabel: def.label,
    url: input.url,
    outcomes,
    steps,
    error: requiredFailed ? 'Pflicht-Schritt fehlgeschlagen' : undefined,
    requiredFailed,
  };
}
