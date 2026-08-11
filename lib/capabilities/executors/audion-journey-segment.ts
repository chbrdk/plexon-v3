/**
 * Optional `audion.journey_segment` (Wave C4) — Agent-facing capability pointer.
 * Journey micro-nodes stay Flow-authored; this capability documents the segment boundary.
 * @see specs/domain/capability-catalog.md
 */

import type {
  CapabilityExecuteContext,
  CapabilityExecutor,
  CapabilityResult,
} from '@/lib/capabilities/types';

export const executeAudionJourneySegment: CapabilityExecutor = async (input, ctx) =>
  executeAudionJourneySegmentCapability(input, ctx);

export async function executeAudionJourneySegmentCapability(
  _input: Record<string, unknown>,
  _ctx: CapabilityExecuteContext
): Promise<CapabilityResult> {
  return {
    ok: false,
    error:
      'Journey-Segmente laufen über Collection Flow (Family A) oder die Intents journey_outline / journey_generate. Starte z. B. einen Journey-Quality-Flow.',
  };
}
