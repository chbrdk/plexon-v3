import { randomUUID } from 'crypto';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';
import { emptyUiLayout } from '@/lib/assistant/ui-blocks/types';

export function buildEventQuickCheckReviewGateLayout(workflowRunId: string): UiLayout {
  const gate = createUiBlock(
    'event_quick_check_review_gate',
    { workflowRunId },
    randomUUID()
  );
  if (!gate.ok) return emptyUiLayout();
  return { version: 1, blocks: [gate.block] };
}
