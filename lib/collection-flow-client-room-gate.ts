/**
 * After Launch-Gate / Fix-Retest completes at quality_ok, publish checkion_overview slot.
 * Spec: suite-enterprise-program.md § E5
 */

import { setClientRoomSlot } from '@/lib/collection-client-room'
import type { RequestUser } from '@/lib/auth-request-user'
import {
  COLLECTION_FLOW_TEMPLATE_FIX_RETEST,
  COLLECTION_FLOW_TEMPLATE_LAUNCH_GATE,
  type CollectionFlowLastRun,
  type CollectionTestFlowDocument,
  type CollectionVerdict,
} from '@/lib/collection-test-flow'

export async function maybePublishClientRoomFromGate(input: {
  platformProjectId: string
  actor: RequestUser
  doc: CollectionTestFlowDocument
  verdict: CollectionVerdict
  lastRun: CollectionFlowLastRun
}): Promise<{ published: boolean; reason?: string }> {
  const tid = input.doc.templateId
  if (
    tid !== COLLECTION_FLOW_TEMPLATE_LAUNCH_GATE &&
    tid !== COLLECTION_FLOW_TEMPLATE_FIX_RETEST
  ) {
    return { published: false, reason: 'not_gate_template' }
  }
  if (!input.verdict.flowCompleted || input.verdict.terminalKind !== 'quality_ok') {
    return { published: false, reason: 'gate_not_passed' }
  }

  const scanId = input.lastRun.scanId?.trim() || `flow:${tid}`
  const title =
    tid === COLLECTION_FLOW_TEMPLATE_FIX_RETEST
      ? 'Gegentest freigegeben'
      : 'Launch-Gate freigegeben'

  const result = await setClientRoomSlot({
    platformProjectId: input.platformProjectId,
    actor: input.actor,
    slotId: 'checkion_overview',
    slot: {
      productId: 'checkion',
      subjectRef: scanId,
      title,
      href: null,
    },
  })

  if (!result.ok) {
    return { published: false, reason: result.error }
  }
  return { published: true }
}
