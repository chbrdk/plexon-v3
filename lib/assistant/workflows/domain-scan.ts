import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs'
import { updateAssistantWorkflowRun } from '@/lib/db/assistant-workflow-runs'
import type { DomainScanPreview } from '@/lib/integrations/checkion-domain-scan-client'
import {
  fetchCheckionDomainScanV3Preview,
  pollCheckionDomainScanV3,
  startCheckionDomainScanV3,
} from '@/lib/integrations/checkion-domain-scans-v3-client'
import { DOMAIN_SCAN_INITIAL_STEPS } from '@/lib/assistant/ui-blocks/workflow-ui'
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

function parseMaxPages(override?: number): number {
  if (typeof override === 'number' && Number.isFinite(override) && override > 0) {
    return Math.min(override, 500)
  }
  const raw = process.env.ASSISTANT_DOMAIN_SCAN_MAX_PAGES?.trim()
  const n = raw ? Number(raw) : 50
  return Number.isFinite(n) && n > 0 ? Math.min(n, 500) : 50
}

/**
 * Domain crawl via CHECKION v3 `/api/domain-scans`.
 * Requires `checkionProjectId` (v3 contract).
 */
export async function runDomainScanWorkflow(
  input: { url: string; checkionProjectId?: string | null; maxPages?: number },
  options: {
    workflowRunId?: string
    initialSteps?: WorkflowStep[]
    onExternalProgress?: (status: string, progress?: number) => void | Promise<void>
  } = {}
): Promise<{
  ok: boolean
  scan?: DomainScanPreview
  scanId?: string
  error?: string
  steps: WorkflowStep[]
}> {
  let steps = options.initialSteps ?? [...DOMAIN_SCAN_INITIAL_STEPS]
  const runId = options.workflowRunId

  steps = await setStep(runId, steps, 'validate_url', { status: 'running' })
  if (!input.url.trim()) {
    steps = await setStep(runId, steps, 'validate_url', { status: 'error', detail: 'URL fehlt' })
    return { ok: false, error: 'URL fehlt', steps }
  }
  const projectId = input.checkionProjectId?.trim() ?? ''
  if (!projectId) {
    steps = await setStep(runId, steps, 'validate_url', {
      status: 'error',
      detail: 'CHECKION-Projekt fehlt',
    })
    return { ok: false, error: 'CHECKION-Projekt-ID fehlt für Domain-Scan (v3)', steps }
  }
  steps = await setStep(runId, steps, 'validate_url', { status: 'done' })

  steps = await setStep(runId, steps, 'start_scan', { status: 'running' })
  const started = await startCheckionDomainScanV3({
    url: input.url,
    projectId,
    maxPages: parseMaxPages(input.maxPages),
    waitForCompletion: false,
  })
  if (!started.ok) {
    steps = await setStep(runId, steps, 'start_scan', { status: 'error', detail: started.error })
    return { ok: false, error: started.error, steps }
  }
  const scanId = started.scan.id
  steps = await setStep(runId, steps, 'start_scan', { status: 'done', detail: scanId })

  const assign = await tryAutoAssignCheckionResource({
    kind: 'domain_scan',
    resourceId: scanId,
    checkionProjectId: projectId,
  })
  if (assign.error) {
    steps = await setStep(runId, steps, 'start_scan', {
      status: 'done',
      detail: `${scanId} · Assign: ${assign.error}`,
    })
  }

  steps = await setStep(runId, steps, 'poll_scan', { status: 'running', progress: 5 })
  const polled = await pollCheckionDomainScanV3(scanId, {
    onProgress: async (status, progress) => {
      await options.onExternalProgress?.(status, progress)
      steps = await setStep(runId, steps, 'poll_scan', {
        status: 'running',
        ...(progress != null ? { progress } : {}),
        detail: status,
      })
    },
  })
  if (!polled.ok) {
    steps = await setStep(runId, steps, 'poll_scan', { status: 'error', detail: polled.error })
    steps = await setStep(runId, steps, 'aggregate', { status: 'error' })
    return { ok: false, error: polled.error, scanId, steps }
  }
  steps = await setStep(runId, steps, 'poll_scan', { status: 'done', progress: 100 })

  steps = await setStep(runId, steps, 'aggregate', { status: 'running' })
  const summary = await fetchCheckionDomainScanV3Preview(scanId)
  if (!summary.ok) {
    steps = await setStep(runId, steps, 'aggregate', { status: 'error', detail: summary.error })
    return { ok: false, error: summary.error, scanId, steps }
  }
  steps = await setStep(runId, steps, 'aggregate', { status: 'done' })

  return { ok: true, scan: summary.preview, scanId, steps }
}
