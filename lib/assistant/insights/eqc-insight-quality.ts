import type { CrossSignal, WorkflowInsightFinding } from '@/lib/assistant/insights/types'

/** Cross-signal IDs that are LLM context only — never findings. */
export const EQC_META_SIGNAL_IDS = new Set([
  'quick-persona',
  'quick-persona-traits',
  'quick-persona-needs',
  'quick-geo-questions',
])

/** Legacy / LLM titles that restate pipeline status instead of insight. */
export const EQC_META_FINDING_TITLES = new Set([
  'AUDION Persona',
  'Top-Traits',
  'GEO-Fragen',
  'Persona-Bedarf',
])

export function isEqcMetaSignal(signal: CrossSignal): boolean {
  return signal.role === 'context' || EQC_META_SIGNAL_IDS.has(signal.id)
}

export function insightEligibleSignals(signals: CrossSignal[]): CrossSignal[] {
  return signals.filter((s) => !isEqcMetaSignal(s))
}

export function isEqcMetaFindingTitle(title: string): boolean {
  const t = title.trim()
  if (EQC_META_FINDING_TITLES.has(t)) return true
  // Soft match for LLM paraphrases of status facts
  if (/^AUDION\s+Persona/i.test(t)) return true
  if (/^Top[- ]?Traits?/i.test(t)) return true
  if (/GEO-Fragen|persona-bezogene Suchanfragen/i.test(t)) return true
  if (/wir haben\s+\d+\s+fragen/i.test(t)) return true
  return false
}

export function filterEqcMetaFindings<T extends { title: string }>(findings: T[]): T[] {
  return findings.filter((f) => !isEqcMetaFindingTitle(f.title))
}

export function findingsFromInsightSignals(signals: CrossSignal[]): WorkflowInsightFinding[] {
  return insightEligibleSignals(signals)
    .slice(0, 6)
    .map((s) => ({
      title: s.title,
      description: s.fact,
      severity: s.severity,
    }))
}
