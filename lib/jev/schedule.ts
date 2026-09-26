import { isJevActEnabled } from '@/lib/jev/env'
import { runShadowDecision, scheduleShadowDecision } from '@/lib/jev/shadow'
import type { JevDecisionResult, JevQuestions, JevShadowCompare } from '@/lib/jev/types'

export type JevScheduleOpts = {
  useCaseId: string
  state: unknown
  questions: JevQuestions
  baseline: unknown
  extractChoiceKey?: string
  extractNoulKey?: string
  extractNoulThreshold?: number
  fetchImpl?: typeof fetch
}

function extractJevFromResult(
  opts: JevScheduleOpts,
  r: JevDecisionResult,
): unknown {
  if (opts.extractChoiceKey) {
    return r.choices[opts.extractChoiceKey]?.key ?? null
  }
  if (opts.extractNoulKey) {
    const p = r.nouls[opts.extractNoulKey]?.probability
    if (typeof p !== 'number') return null
    return p >= (opts.extractNoulThreshold ?? 0.5)
  }
  return null
}

/** Fire-and-forget Jev shadow for a fuzzy baseline decision. */
export function scheduleJevShadow(opts: JevScheduleOpts): void {
  scheduleShadowDecision({
    useCaseId: opts.useCaseId,
    state: opts.state,
    questions: opts.questions,
    baseline: opts.baseline,
    extractJev: (r) => extractJevFromResult(opts, r),
    fetchImpl: opts.fetchImpl,
  })
}

/**
 * When Act is on: await Jev and return compare (SoT path).
 * When only shadow: fire-and-forget, return null.
 * Spec: specs/domain/jev-decisions.md § Act-apply
 */
export async function resolveJevActOrShadow(
  opts: JevScheduleOpts,
): Promise<JevShadowCompare | null> {
  if (isJevActEnabled(opts.useCaseId)) {
    return runShadowDecision({
      useCaseId: opts.useCaseId,
      state: opts.state,
      questions: opts.questions,
      baseline: opts.baseline,
      extractJev: (r) => extractJevFromResult(opts, r),
      awaitResult: true,
      fetchImpl: opts.fetchImpl,
    })
  }
  scheduleJevShadow(opts)
  return null
}
