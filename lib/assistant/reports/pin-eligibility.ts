import type { UiBlock } from '@/lib/assistant/ui-blocks/types';
import type { UiStepStatus } from '@/lib/assistant/ui-blocks/types';

export type PinEligibilityReason =
  | 'streaming'
  | 'step_list_in_progress'
  | 'step_list_empty'
  | 'invalid_block';

export type PinEligibility = { pinnable: true } | { pinnable: false; reason: PinEligibilityReason };

function stepStatuses(block: UiBlock): UiStepStatus[] {
  const steps = block.props.steps;
  if (!Array.isArray(steps)) return [];
  return steps
    .map((s) => (s && typeof s === 'object' && 'status' in s ? (s as { status: UiStepStatus }).status : null))
    .filter((s): s is UiStepStatus => s === 'pending' || s === 'running' || s === 'done' || s === 'error');
}

/**
 * Intermediate workflow steps (running/pending step_list) are not pinable.
 * Completed step lists (all done/error) may be included in a report.
 */
export function isUiBlockPinnable(
  block: UiBlock,
  options?: { streaming?: boolean }
): PinEligibility {
  if (options?.streaming) {
    return { pinnable: false, reason: 'streaming' };
  }

  if (block.type === 'step_list') {
    const statuses = stepStatuses(block);
    if (statuses.length === 0) {
      return { pinnable: false, reason: 'step_list_empty' };
    }
    const hasIntermediate = statuses.some((s) => s === 'pending' || s === 'running');
    if (hasIntermediate) {
      return { pinnable: false, reason: 'step_list_in_progress' };
    }
  }

  if (!block.id || !block.type) {
    return { pinnable: false, reason: 'invalid_block' };
  }

  return { pinnable: true };
}

export function findBlockInMessage(
  metadata: Record<string, unknown> | null | undefined,
  blockId: string
): UiBlock | null {
  const layout = metadata?.uiLayout;
  if (!layout || typeof layout !== 'object') return null;
  const blocks = (layout as { blocks?: unknown }).blocks;
  if (!Array.isArray(blocks)) return null;
  for (const raw of blocks) {
    if (!raw || typeof raw !== 'object') continue;
    const b = raw as UiBlock;
    if (b.id === blockId) return b;
  }
  return null;
}
