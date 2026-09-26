/**
 * Shared UI score tone — P2 Jev shadow.
 * Spec: specs/domain/jev-use-case-catalog.md
 */

import { JEV_USE_CASES, questionsScoreTone } from '@/lib/jev/catalog'
import { scheduleJevShadow } from '@/lib/jev/schedule'

export type ScoreTone = 'pos' | 'low' | 'neg'

/** Heuristic SoT; Jev shadows when enabled. */
export function resolveScoreTone(score: number): ScoreTone {
  const n = Number.isFinite(score) ? score : 0
  const tone: ScoreTone = n >= 70 ? 'pos' : n >= 45 ? 'low' : 'neg'
  scheduleJevShadow({
    useCaseId: JEV_USE_CASES.uiScoreTone,
    state: { score: n },
    questions: questionsScoreTone(),
    baseline: tone,
    extractChoiceKey: 'tone',
  })
  return tone
}
