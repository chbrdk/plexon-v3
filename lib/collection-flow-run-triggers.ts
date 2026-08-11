/**
 * Session-owned Collection Flow run triggers (board UI + Assistant).
 * Webhook/service stay machine triggers.
 */

import type { CollectionFlowRunTrigger } from '@/lib/db/collection-flow-runs';

export function isSessionOwnedFlowTrigger(
  trigger: string | null | undefined
): trigger is 'ui' | 'assistant' {
  return trigger === 'ui' || trigger === 'assistant';
}

export const SESSION_OWNED_FLOW_TRIGGERS: CollectionFlowRunTrigger[] = ['ui', 'assistant'];
