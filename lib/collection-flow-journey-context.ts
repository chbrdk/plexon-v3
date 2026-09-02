/**
 * Wave 22/25 — seed post-journey node outputs into run context;
 * truncate + rehydrate for run outputs dossier.
 * @see specs/domain/collection-test-flow.md Wave 22 / Wave 25
 */

import type {
  CollectionFlowLastRun,
  CollectionTestFlowDocument,
  EmbeddedAudionJourneyFlow,
} from '@/lib/collection-test-flow'
import { resolveJourneyFlowForRun } from '@/lib/collection-test-flow'
import {
  setContextBundle,
  type CollectionFlowRunContext,
} from '@/lib/collection-flow-run-context'
import {
  mapJobToFlowNodeInspector,
  mapJobToFlowNodeOutputs,
  type FlowNodeInspectorData,
  type FlowNodeRunOutput,
  type FlowRunProgressStep,
} from '@/lib/collection-flow-run-progress'

export const JOURNEY_STEPS_MAX = 40
export const JOURNEY_STEP_TEXT_MAX = 2000

export type PersistedJourneyStep = NonNullable<
  NonNullable<CollectionFlowLastRun['journeyPersonaRuns']>[number]['steps']
>[number]

function clipText(value: string | null | undefined, max: number): string | null {
  if (value == null) return null
  const t = value.trim()
  if (!t) return null
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

/** Cap + truncate AUDION steps before persisting on lastRun. */
export function truncateJourneySteps(
  steps: FlowRunProgressStep[] | null | undefined,
): PersistedJourneyStep[] {
  if (!steps?.length) return []
  return steps.slice(0, JOURNEY_STEPS_MAX).map((s, i) => ({
    step: s.step ?? i + 1,
    action: s.action ?? null,
    target: s.target ?? null,
    result: clipText(s.result, JOURNEY_STEP_TEXT_MAX),
    reasoning: clipText(s.reasoning, JOURNEY_STEP_TEXT_MAX),
    imageUrl: (s.screenshotUrl ?? s.screenshot ?? null) || null,
    timestamp: s.timestamp ?? null,
  }))
}

export function persistedStepsToProgress(
  steps: PersistedJourneyStep[] | null | undefined,
): FlowRunProgressStep[] {
  if (!steps?.length) return []
  return steps.map((s) => ({
    step: s.step,
    action: s.action ?? undefined,
    target: s.target ?? undefined,
    result: s.result ?? undefined,
    reasoning: s.reasoning ?? null,
    timestamp: s.timestamp ?? null,
    screenshotUrl: s.imageUrl ?? null,
  }))
}

export function seedJourneyNodeOutputsIntoContext(
  ctx: CollectionFlowRunContext,
  journeyFlow: EmbeddedAudionJourneyFlow | null | undefined,
  steps: FlowRunProgressStep[] | null | undefined,
  opts?: { jobId?: string | null; status?: string },
): CollectionFlowRunContext {
  if (!journeyFlow?.nodes?.length || !steps?.length) return ctx
  const outputs = mapJobToFlowNodeOutputs(journeyFlow, {
    status: opts?.status ?? 'complete',
    steps,
    jobId: opts?.jobId ?? null,
  })
  let next = ctx
  for (const [nodeId, out] of Object.entries(outputs)) {
    next = setContextBundle(
      next,
      nodeId,
      {
        text: out.text ?? null,
        label: out.label ?? null,
        result: out.text ?? null,
        note: null,
        step: out.step ?? null,
        imageUrl: out.imageUrl ?? null,
      },
      nodeId,
    )
  }
  return next
}

/**
 * Seed outputs for every persona chain (UC2 dual). Falls back to a single
 * primary flow + steps when persona runs are empty.
 */
export function seedAllPersonaJourneyOutputsIntoContext(
  ctx: CollectionFlowRunContext,
  doc: CollectionTestFlowDocument,
  runUrl: string,
  personaRuns: NonNullable<CollectionFlowLastRun['journeyPersonaRuns']> | null | undefined,
  fallback?: {
    journeyFlow: EmbeddedAudionJourneyFlow | null
    steps: FlowRunProgressStep[] | null
    jobId?: string | null
  },
): CollectionFlowRunContext {
  let next = ctx
  const runs = personaRuns ?? []
  if (runs.length) {
    for (const run of runs) {
      const steps = persistedStepsToProgress(run.steps)
      if (!steps.length) continue
      const journeyFlow = resolveJourneyFlowForRun(doc, runUrl, {
        personaNodeId: run.personaNodeId || null,
      })
      next = seedJourneyNodeOutputsIntoContext(next, journeyFlow, steps, {
        jobId: run.jobId,
        status: 'complete',
      })
    }
    return next
  }
  if (fallback?.journeyFlow && fallback.steps?.length) {
    return seedJourneyNodeOutputsIntoContext(next, fallback.journeyFlow, fallback.steps, {
      jobId: fallback.jobId ?? null,
      status: 'complete',
    })
  }
  return next
}

function contextBundleToOutput(
  bundle: Record<string, unknown> | undefined,
): FlowNodeRunOutput | null {
  if (!bundle) return null
  const text =
    (typeof bundle.text === 'string' && bundle.text.trim()) ||
    (typeof bundle.result === 'string' && bundle.result.trim()) ||
    (typeof bundle.summary === 'string' && bundle.summary.trim()) ||
    null
  const label = typeof bundle.label === 'string' ? bundle.label : null
  const imageUrl = typeof bundle.imageUrl === 'string' ? bundle.imageUrl : null
  const step = typeof bundle.step === 'number' ? bundle.step : null
  if (!text && !label && !imageUrl) {
    // scan/brand-ish summaries
    const score = bundle.overallScore ?? bundle.score
    const passed = bundle.passed
    if (score == null && passed == null && !bundle.taskCompleted) return null
    const parts: string[] = []
    if (score != null) parts.push(`Score ${String(score)}`)
    if (passed === true) parts.push('pass')
    if (passed === false) parts.push('fail')
    if (bundle.taskCompleted === true) parts.push('task completed')
    if (bundle.finalUrl) parts.push(String(bundle.finalUrl))
    if (!parts.length) return null
    return { text: parts.join(' · '), label: label ?? 'Output', step, imageUrl }
  }
  return { text, label, step, imageUrl }
}

export type RehydratedFlowRunUi = {
  runOutputs: Record<string, FlowNodeRunOutput>
  inspectorByNode: Record<string, FlowNodeInspectorData>
}

/** Rebuild live board outputs/inspector from persisted lastRun (Wave 25). */
export function rehydrateFlowRunUi(
  doc: CollectionTestFlowDocument,
  lastRun: CollectionFlowLastRun | null | undefined,
): RehydratedFlowRunUi {
  const runOutputs: Record<string, FlowNodeRunOutput> = {}
  const inspectorByNode: Record<string, FlowNodeInspectorData> = {}
  if (!lastRun) return { runOutputs, inspectorByNode }

  const runUrl = lastRun.stepUrl || lastRun.url || 'https://example.com'
  const runs = lastRun.journeyPersonaRuns ?? []

  for (const run of runs) {
    const steps = persistedStepsToProgress(run.steps)
    if (!steps.length) continue
    const journeyFlow = resolveJourneyFlowForRun(doc, runUrl, {
      personaNodeId: run.personaNodeId || null,
    })
    if (!journeyFlow) continue
    const input = {
      status: 'complete' as const,
      steps,
      jobId: run.jobId,
      finalUrl: run.finalUrl,
      success: run.taskCompleted,
    }
    Object.assign(runOutputs, mapJobToFlowNodeOutputs(journeyFlow, input))
    const insp = mapJobToFlowNodeInspector(journeyFlow, input)
    for (const [nodeId, data] of Object.entries(insp)) {
      if (!inspectorByNode[nodeId]) {
        inspectorByNode[nodeId] = data
      } else {
        inspectorByNode[nodeId] = {
          steps: [...inspectorByNode[nodeId].steps, ...data.steps],
          gateEvaluation: data.gateEvaluation ?? inspectorByNode[nodeId].gateEvaluation,
        }
      }
    }
  }

  // Fallback / quality nodes from context.outputs
  const outputs = lastRun.context?.outputs ?? {}
  for (const node of doc.nodes) {
    if (runOutputs[node.id]?.text) continue
    const bundle = outputs[node.id]
    if (!bundle || typeof bundle !== 'object') continue
    const mapped = contextBundleToOutput(bundle as Record<string, unknown>)
    if (mapped) runOutputs[node.id] = mapped
  }

  // Compare results → short text on compare nodes
  for (const cr of lastRun.compareResults ?? []) {
    if (runOutputs[cr.nodeId]?.text) continue
    runOutputs[cr.nodeId] = {
      label: cr.path,
      text: `${cr.passed ? 'pass' : 'fail'}${cr.actual != null ? ` · ${String(cr.actual)}` : ''}`,
    }
  }

  // Scan / brand catalog roots when node ids missing
  for (const node of doc.nodes) {
    if (runOutputs[node.id]?.text) continue
    if (node.kind === 'scan' && outputs.scan) {
      const mapped = contextBundleToOutput(outputs.scan as Record<string, unknown>)
      if (mapped) runOutputs[node.id] = { ...mapped, label: mapped.label ?? 'Scan' }
    }
    if (node.kind === 'brand_measure' && outputs.brand) {
      const mapped = contextBundleToOutput(outputs.brand as Record<string, unknown>)
      if (mapped) runOutputs[node.id] = { ...mapped, label: mapped.label ?? 'Brand' }
    }
  }

  return { runOutputs, inspectorByNode }
}

/** Build dossier rows: nodes with displayable output, document order. */
export function buildFlowOutputsDossierItems(
  nodes: Array<{ id: string; kind: string; label?: string }>,
  runOutputs: Record<string, FlowNodeRunOutput>,
): Array<{
  nodeId: string
  kind: string
  label: string
  text: string
  highlight: boolean
}> {
  const items: Array<{
    nodeId: string
    kind: string
    label: string
    text: string
    highlight: boolean
  }> = []
  for (const node of nodes) {
    const out = runOutputs[node.id]
    const text = out?.text?.trim()
    if (!text) continue
    const highlight =
      node.kind === 'prompt' ||
      node.kind === 'success' ||
      node.kind === 'message' ||
      node.kind === 'measure' ||
      node.kind === 'persona'
    items.push({
      nodeId: node.id,
      kind: node.kind,
      label: node.label || node.kind,
      text,
      highlight,
    })
  }
  return items
}
