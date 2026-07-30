import { isUiBlockType } from '@/lib/assistant/ui-blocks/validate';
import type { UiBlock, UiPanelState } from '@/lib/assistant/ui-blocks/types';
import type { UiBlockAccumulator } from '@/lib/assistant/ui-tools/accumulator';
import {
  PLEXON_UI_APPEND_BLOCK,
  PLEXON_UI_CLEAR_BLOCKS,
  PLEXON_UI_SET_PANEL,
  PLEXON_UI_UPDATE_BLOCK,
  PLEXON_UI_RENDER_TEXT,
  isPlexonUiTool,
} from '@/lib/assistant/ui-tools/definitions';

export type PlexonUiToolResult = {
  ok: boolean;
  blockId?: string;
  block?: UiBlock;
  index?: number;
  error?: string;
  cleared?: boolean;
  panel?: UiPanelState;
};

function parseClearScope(raw: unknown): 'message' | 'panel' | 'all' {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (s === 'panel' || s === 'all') return s;
  return 'message';
}

export function executePlexonUiTool(
  toolName: string,
  input: Record<string, unknown>,
  accumulator: UiBlockAccumulator
): PlexonUiToolResult {
  if (!isPlexonUiTool(toolName)) {
    return { ok: false, error: `Not a PLEXON UI tool: ${toolName}` };
  }

  if (toolName === PLEXON_UI_CLEAR_BLOCKS) {
    accumulator.clear(parseClearScope(input.scope));
    return { ok: true, cleared: true };
  }

  if (toolName === PLEXON_UI_APPEND_BLOCK) {
    const typeRaw = typeof input.type === 'string' ? input.type.trim() : '';
    if (!isUiBlockType(typeRaw)) {
      return { ok: false, error: `Unknown block type: ${typeRaw || '(missing)'}` };
    }
    const result = accumulator.appendBlock(typeRaw, input.props ?? {});
    if (!result.ok) return { ok: false, error: result.error };
    return {
      ok: true,
      blockId: result.block.id,
      block: result.block,
      index: accumulator.blockCount - 1,
    };
  }

  if (toolName === PLEXON_UI_UPDATE_BLOCK) {
    const id = typeof input.id === 'string' ? input.id.trim() : '';
    if (!id) return { ok: false, error: 'Block id required' };
    const result = accumulator.updateBlock(id, input.props ?? {});
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, blockId: result.block.id, block: result.block, index: result.index };
  }

  if (toolName === PLEXON_UI_SET_PANEL) {
    const open = input.open === true;
    const title = typeof input.title === 'string' ? input.title : undefined;
    const blocks = Array.isArray(input.blocks)
      ? (input.blocks as Array<{ type: string; props: unknown }>)
      : undefined;
    const result = accumulator.setPanel({ open, title, blocks });
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, panel: result.panel };
  }

  if (toolName === PLEXON_UI_RENDER_TEXT) {
    const markdown = typeof input.markdown === 'string' ? input.markdown : '';
    const result = accumulator.appendBlock('text', { markdown });
    if (!result.ok) return { ok: false, error: result.error };
    return {
      ok: true,
      blockId: result.block.id,
      block: result.block,
      index: accumulator.blockCount - 1,
    };
  }

  return { ok: false, error: `Unknown PLEXON UI tool: ${toolName}` };
}
