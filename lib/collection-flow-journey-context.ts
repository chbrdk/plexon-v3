/**
 * Wave 22 — seed post-journey node outputs into run context for quality-param re-resolve.
 * @see specs/domain/collection-test-flow.md Wave 22
 */

import type { EmbeddedAudionJourneyFlow } from '@/lib/collection-test-flow';
import {
  setContextBundle,
  type CollectionFlowRunContext,
} from '@/lib/collection-flow-run-context';
import {
  mapJobToFlowNodeOutputs,
  type FlowRunProgressStep,
} from '@/lib/collection-flow-run-progress';

export function seedJourneyNodeOutputsIntoContext(
  ctx: CollectionFlowRunContext,
  journeyFlow: EmbeddedAudionJourneyFlow | null | undefined,
  steps: FlowRunProgressStep[] | null | undefined,
  opts?: { jobId?: string | null; status?: string }
): CollectionFlowRunContext {
  if (!journeyFlow?.nodes?.length || !steps?.length) return ctx;
  const outputs = mapJobToFlowNodeOutputs(journeyFlow, {
    status: opts?.status ?? 'complete',
    steps,
    jobId: opts?.jobId ?? null,
  });
  let next = ctx;
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
      nodeId
    );
  }
  return next;
}
