import type { WorkflowStep } from '@/lib/db/assistant-workflow-runs';
import type { UiBlock, UiLayout, UiPanelState } from '@/lib/assistant/ui-blocks/types';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import { isUiBlockType } from '@/lib/assistant/ui-blocks/validate';
import { sanitizeUiBlockProps } from '@/lib/assistant/ui-blocks/sanitize-props';
import { ASSISTANT_WORKFLOW_STEP_LIST_BLOCK_ID } from '@/lib/assistant/ui-constants';
import {
  buildStepListBlock,
  buildSummaryCardBlock,
  type SummaryCardInput,
} from '@/lib/assistant/ui-blocks/build-workflow-ui';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function parseUiBlock(raw: unknown): UiBlock | null {
  if (!isRecord(raw)) return null;
  const type = typeof raw.type === 'string' ? raw.type : '';
  const id = typeof raw.id === 'string' ? raw.id : '';
  if (!id || !isUiBlockType(type)) return null;
  const props = isRecord(raw.props)
    ? (sanitizeUiBlockProps(raw.props) as Record<string, unknown>)
    : {};
  return { id, type, props, meta: isRecord(raw.meta) ? (raw.meta as UiBlock['meta']) : undefined };
}

function parsePanel(raw: unknown): UiPanelState | undefined {
  if (!isRecord(raw)) return undefined;
  const open = raw.open === true;
  const title = typeof raw.title === 'string' ? raw.title : undefined;
  const blocks = Array.isArray(raw.blocks)
    ? raw.blocks.map(parseUiBlock).filter((b): b is UiBlock => b != null)
    : [];
  if (!open && blocks.length === 0) return undefined;
  return { open, title, blocks };
}

export function parseUiLayoutFromMetadata(metadata: unknown): UiLayout | null {
  if (!isRecord(metadata)) return null;
  const raw = metadata.uiLayout;
  if (!isRecord(raw)) return null;
  const blocks = Array.isArray(raw.blocks)
    ? raw.blocks.map(parseUiBlock).filter((b): b is UiBlock => b != null)
    : [];
  const panel = parsePanel(raw.panel);
  if (blocks.length === 0 && !panel?.open && (panel?.blocks.length ?? 0) === 0) return null;
  return { version: UI_LAYOUT_VERSION, blocks, panel };
}

function legacyBlocksFromMetadata(metadata: Record<string, unknown>): UiBlock[] {
  const blocks: UiBlock[] = [];
  const parsed = parseUiLayoutFromMetadata(metadata);
  const hasStepListInLayout = Boolean(
    parsed?.blocks.some(
      (b) => b.type === 'step_list' || b.id === ASSISTANT_WORKFLOW_STEP_LIST_BLOCK_ID
    )
  );

  const workflowSteps = metadata.workflowSteps as WorkflowStep[] | undefined;
  if (workflowSteps?.length && !hasStepListInLayout) {
    const stepBlock = buildStepListBlock(workflowSteps);
    if (stepBlock.ok) blocks.push(stepBlock.block);
  }

  const summary = metadata.summary as SummaryCardInput | undefined;
  if (summary?.platformProject) {
    const summaryBlock = buildSummaryCardBlock(summary);
    if (summaryBlock.ok) blocks.push(summaryBlock.block);
  }

  return blocks;
}

export function resolveMessageUiLayout(metadata: unknown): UiLayout | null {
  if (!isRecord(metadata)) return null;
  const parsed = parseUiLayoutFromMetadata(metadata);
  const legacy = legacyBlocksFromMetadata(metadata);

  if (!parsed && legacy.length === 0) return null;

  const blocks = [...(parsed?.blocks ?? [])];
  for (const block of legacy) {
    if (!blocks.some((b) => b.type === block.type && JSON.stringify(b.props) === JSON.stringify(block.props))) {
      blocks.push(block);
    }
  }

  return {
    version: UI_LAYOUT_VERSION,
    blocks,
    panel: parsed?.panel,
  };
}

export function getMessageUiBlocks(metadata: unknown): UiBlock[] {
  return resolveMessageUiLayout(metadata)?.blocks ?? [];
}

export function getMessageUiPanel(metadata: unknown): UiPanelState | null {
  const panel = resolveMessageUiLayout(metadata)?.panel;
  if (!panel?.open) return null;
  return panel;
}

/** Append open panel blocks onto message blocks (dedupe by id) for overlay/flyout. */
export function mergeUiLayoutBlocksWithPanel(layout: UiLayout): UiBlock[] {
  const blocks = [...layout.blocks];
  const panelBlocks = layout.panel?.open ? layout.panel.blocks : [];
  for (const block of panelBlocks) {
    if (!blocks.some((b) => b.id === block.id)) {
      blocks.push(block);
    }
  }
  return blocks;
}

/**
 * Overlay flyout: fold side-panel blocks into the chat stream.
 * Expand workspace: message column only (panel stays in AssistantPanel).
 */
export function messageUiBlocksForSurface(
  metadata: unknown,
  surface: 'overlay' | 'expand'
): UiBlock[] {
  const layout = resolveMessageUiLayout(metadata);
  if (!layout) return [];
  if (surface === 'overlay') return mergeUiLayoutBlocksWithPanel(layout);
  return layout.blocks;
}
