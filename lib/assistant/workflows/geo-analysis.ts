import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import { updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs';
import type { GeoEeatJobPreview } from '@/lib/integrations/checkion-geo-client';
import {
  pollCheckionGeoEeatJob,
  rerunCheckionGeoCompetitive,
  startCheckionGeoEeat,
} from '@/lib/integrations/checkion-geo-client';
import { GEO_ANALYSIS_INITIAL_STEPS } from '@/lib/assistant/ui-blocks/workflow-ui';
import { tryAutoAssignCheckionResource } from '@/lib/assistant/auto-assign-checkion';

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

export async function runGeoAnalysisWorkflow(
  input: {
    url: string;
    checkionProjectId?: string | null;
    deep?: boolean;
    queries?: string[];
    competitors?: string[];
    runCompetitive?: boolean;
    generateQueries?: boolean;
  },
  options: {
    workflowRunId?: string;
    initialSteps?: WorkflowStep[];
    onExternalProgress?: (status: string, progress: number) => void | Promise<void>;
  } = {}
): Promise<{
  ok: boolean;
  job?: GeoEeatJobPreview;
  jobId?: string;
  competitiveWarning?: string;
  error?: string;
  steps: WorkflowStep[];
}> {
  let steps = options.initialSteps ?? [...GEO_ANALYSIS_INITIAL_STEPS];
  const runId = options.workflowRunId;

  steps = await setStep(runId, steps, 'prepare', { status: 'running' });
  if (!input.url.trim()) {
    steps = await setStep(runId, steps, 'prepare', { status: 'error', detail: 'URL fehlt' });
    return { ok: false, error: 'URL fehlt', steps };
  }
  steps = await setStep(runId, steps, 'prepare', { status: 'done' });

  steps = await setStep(runId, steps, 'start_job', { status: 'running' });
  const started = await startCheckionGeoEeat({
    url: input.url,
    projectId: input.checkionProjectId,
    queries: input.queries,
    competitors: input.competitors,
    runCompetitive: input.runCompetitive,
    generateQueries: input.generateQueries,
  });
  if (!started.ok) {
    steps = await setStep(runId, steps, 'start_job', { status: 'error', detail: started.error });
    steps = await setStep(runId, steps, 'run_analysis', { status: 'error' });
    return { ok: false, error: started.error, steps };
  }
  steps = await setStep(runId, steps, 'start_job', {
    status: 'done',
    detail: started.jobId,
  });

  const assign = await tryAutoAssignCheckionResource({
    kind: 'geo_eeat',
    resourceId: started.jobId,
    checkionProjectId: input.checkionProjectId,
  });
  if (assign.error) {
    steps = await setStep(runId, steps, 'start_job', {
      status: 'done',
      detail: `${started.jobId} · Assign: ${assign.error}`,
    });
  }

  steps = await setStep(runId, steps, 'run_analysis', { status: 'running', progress: 10 });
  const polled = await pollCheckionGeoEeatJob(started.jobId, {
    onProgress: async (status, progress) => {
      await options.onExternalProgress?.(status, progress);
      steps = await setStep(runId, steps, 'run_analysis', {
        status: 'running',
        progress,
        detail: status,
      });
    },
  });

  if (!polled.ok) {
    steps = await setStep(runId, steps, 'run_analysis', {
      status: 'error',
      detail: polled.error,
    });
    steps = await setStep(runId, steps, 'aggregate', { status: 'error' });
    return { ok: false, error: polled.error, jobId: started.jobId, steps };
  }

  let job = polled.job;
  let competitiveWarning: string | undefined;

  if (input.deep) {
    const rerun = await rerunCheckionGeoCompetitive(started.jobId);
    if (!rerun.ok) {
      competitiveWarning = rerun.error;
    } else {
      const repoll = await pollCheckionGeoEeatJob(started.jobId, {
        maxMs: 5 * 60 * 1000,
        onProgress: async (status, progress) => {
          steps = await setStep(runId, steps, 'run_analysis', {
            status: 'running',
            progress,
            detail: `competitive: ${status}`,
          });
        },
      });
      if (repoll.ok) {
        job = repoll.job;
      } else {
        competitiveWarning = repoll.error;
      }
    }
  }

  steps = await setStep(runId, steps, 'run_analysis', { status: 'done', progress: 100 });
  steps = await setStep(runId, steps, 'aggregate', { status: 'done' });

  return {
    ok: true,
    job,
    jobId: started.jobId,
    competitiveWarning,
    steps,
  };
}
