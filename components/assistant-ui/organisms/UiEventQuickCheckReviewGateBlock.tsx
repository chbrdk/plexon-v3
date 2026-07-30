'use client';

import { EventQuickCheckReviewGate } from '@/components/event-quick-check/EventQuickCheckReviewGate';

export type UiEventQuickCheckReviewGateBlockProps = {
  workflowRunId: string;
};

export function UiEventQuickCheckReviewGateBlock({
  workflowRunId,
}: UiEventQuickCheckReviewGateBlockProps) {
  return (
    <EventQuickCheckReviewGate
      workflowRunId={workflowRunId}
      onComplete={() => {
        window.dispatchEvent(
          new CustomEvent('plexon:quick-check-gate-complete', { detail: { workflowRunId } })
        );
      }}
    />
  );
}
