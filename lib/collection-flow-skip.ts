/**
 * Stable skip reasons for Collection Flow runtime (Enterprise E5/E8).
 * Spec: suite-enterprise-program.md — fehlende Capability = skipped + Grund.
 */

import {
  COLLECTION_FLOW_TEMPLATE_CRISIS,
  COLLECTION_FLOW_TEMPLATE_FIX_RETEST,
  COLLECTION_FLOW_TEMPLATE_LAUNCH_GATE,
  type CollectionTestFlowDocument,
} from '@/lib/collection-test-flow'

export const FLOW_SKIP_REASONS = {
  CAPABILITY_UNBOUND_CHECKION: 'capability_unbound:checkion',
  CAPABILITY_UNBOUND_AUDION: 'capability_unbound:audion',
  CAPABILITY_UNBOUND_BRANDION: 'capability_unbound:brandion',
  CAPABILITY_UNBOUND_VIDEON: 'capability_unbound:videon',
  NODE_ABSENT: 'node_absent',
  RETEST_NO_PRIOR: 'retest_no_prior_run',
} as const

export type FlowSkipReason = (typeof FLOW_SKIP_REASONS)[keyof typeof FLOW_SKIP_REASONS] | string

/** Templates that soft-skip unbound capabilities instead of hard-failing the whole run. */
export function isEnterpriseSoftSkipTemplate(doc: CollectionTestFlowDocument): boolean {
  const tid = doc.templateId
  return (
    tid === COLLECTION_FLOW_TEMPLATE_CRISIS ||
    tid === COLLECTION_FLOW_TEMPLATE_LAUNCH_GATE ||
    tid === COLLECTION_FLOW_TEMPLATE_FIX_RETEST
  )
}

export function formatSkipMessage(reason: FlowSkipReason): string {
  switch (reason) {
    case FLOW_SKIP_REASONS.CAPABILITY_UNBOUND_CHECKION:
      return 'Skipped: CHECKION not bound on this Collection'
    case FLOW_SKIP_REASONS.CAPABILITY_UNBOUND_AUDION:
      return 'Skipped: AUDION not bound on this Collection'
    case FLOW_SKIP_REASONS.CAPABILITY_UNBOUND_BRANDION:
      return 'Skipped: BRANDION not bound on this Collection'
    case FLOW_SKIP_REASONS.CAPABILITY_UNBOUND_VIDEON:
      return 'Skipped: VIDEON not bound on this Collection'
    case FLOW_SKIP_REASONS.RETEST_NO_PRIOR:
      return 'Skipped: retest has no prior quality run'
    case FLOW_SKIP_REASONS.NODE_ABSENT:
      return 'Skipped: node not present in flow'
    default:
      return `Skipped: ${reason}`
  }
}
