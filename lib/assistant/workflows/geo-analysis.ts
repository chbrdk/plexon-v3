import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs'
import { updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs'
import type { GeoEeatJobPreview } from '@/lib/integrations/checkion-geo-client'
import {
  pollCheckionGeoJobV3,
  startCheckionGeoJobV3,
} from '@/lib/integrations/checkion-geo-jobs-v3-client'
import { GEO_ANALYSIS_INITIAL_STEPS } from '@/lib/assistant/ui-blocks/workflow-ui'
import { tryAutoAssignCheckionResource } from '@/lib/assistant/auto-assign-checkion'

async function setStep(
  runId: string | undefined,
  steps: WorkflowStep[],
  stepId: string,
  patch: Partial<WorkflowStep>
): Promise<WorkflowStep[]> {
  const next = steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s))
  if (runId) {
    await updateAssistantWorkflowRun(runId, { steps: next, status: 'running' })
  }
  return next
}

/**
 * GEO / E-E-A-T via CHECKION v3 `/api/geo-jobs`.
 * Requires `checkionProjectId`. Deep mode enables page-scan + competitor hosts at start
 * (no separate legacy competitive rerun endpoint).
 */
export async function runGeoAnalysisWorkflow(
  input: {
    url: string
    checkionProjectId?: string | null
    platformProjectId?: string | null
    deep?: boolean
    queries?: string[]
    competitors?: string[]
    runCompetitive?: boolean
    generateQueries?: boolean
  },
  options: {
    workflowRunId?: string
    initialSteps?: WorkflowStep[]
    onExternalProgress?: (status: string, progress: number) => void | Promise<void>
  } = {}
): Promise<{
  ok: boolean
  job?: GeoEeatJobPreview
  jobId?: string
  competitiveWarning?: string
  error?: string
  steps: WorkflowStep[]
}> {
  let steps = options.initialSteps ?? [...GEO_ANALYSIS_INITIAL_STEPS]
  const runId = options.workflowRunId

  steps = await setStep(runId, steps, 'prepare', { status: 'running' })
  if (!input.url.trim()) {
    steps = await setStep(runId, steps, 'prepare', { status: 'error', detail: 'URL fehlt' })
    return { ok: false, error: 'URL fehlt', steps }
  }
  const projectId = input.checkionProjectId?.trim() ?? ''
  if (!projectId) {
    steps = await setStep(runId, steps, 'prepare', {
      status: 'error',
      detail: 'CHECKION-Projekt fehlt',
    })
    return { ok: false, error: 'CHECKION-Projekt-ID fehlt für GEO (v3)', steps }
  }
  steps = await setStep(runId, steps, 'prepare', { status: 'done' })

  steps = await setStep(runId, steps, 'start_job', { status: 'running' })
  const started = await startCheckionGeoJobV3({
    url: input.url,
    projectId,
    platformProjectId: input.platformProjectId?.trim() || undefined,
    queries: input.queries,
    competitors: input.competitors,
    includePageScan: Boolean(input.deep || input.runCompetitive),
  })
  if (!started.ok) {
    steps = await setStep(runId, steps, 'start_job', { status: 'error', detail: started.error })
    steps = await setStep(runId, steps, 'run_analysis', { status: 'error' })
    return { ok: false, error: started.error, steps }
  }
  const jobId = started.job.id
  steps = await setStep(runId, steps, 'start_job', {
    status: 'done',
    detail: jobId,
  })

  const assign = await tryAutoAssignCheckionResource({
    kind: 'geo_eeat',
    resourceId: jobId,
    checkionProjectId: projectId,
  })
  if (assign.error) {
    steps = await setStep(runId, steps, 'start_job', {
      status: 'done',
      detail: `${jobId} · Assign: ${assign.error}`,
    })
  }

  steps = await setStep(runId, steps, 'run_analysis', { status: 'running', progress: 10 })
  const polled = await pollCheckionGeoJobV3(jobId, {
    onProgress: async (status, progress) => {
      await options.onExternalProgress?.(status, progress)
      steps = await setStep(runId, steps, 'run_analysis', {
        status: 'running',
        progress,
        detail: status,
      })
    },
  })

  if (!polled.ok) {
    steps = await setStep(runId, steps, 'run_analysis', {
      status: 'error',
      detail: polled.error,
    })
    steps = await setStep(runId, steps, 'aggregate', { status: 'error' })
    return { ok: false, error: polled.error, jobId, steps }
  }

  let competitiveWarning: string | undefined
  if (input.deep && !(input.competitors && input.competitors.length > 0)) {
    competitiveWarning =
      'Kompetitive Analyse ohne Wettbewerber-Hosts — Ergebnisse ggf. nur Solo-GEO'
  }

  steps = await setStep(runId, steps, 'run_analysis', { status: 'done', progress: 100 })
  steps = await setStep(runId, steps, 'aggregate', { status: 'done' })

  return {
    ok: true,
    job: polled.preview,
    jobId,
    competitiveWarning,
    steps,
  }
}
