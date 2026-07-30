import type { AnthropicTool } from '@/lib/checkion-mcp-client';
import { UI_BLOCK_TYPES } from '@/lib/assistant/ui-blocks/types';

export const PLEXON_UI_TOOL_PREFIX = 'plexon_ui_';

export function isPlexonUiTool(toolName: string): boolean {
  return toolName.startsWith(PLEXON_UI_TOOL_PREFIX);
}

export const PLEXON_UI_APPEND_BLOCK = 'plexon_ui_append_block';
export const PLEXON_UI_UPDATE_BLOCK = 'plexon_ui_update_block';
export const PLEXON_UI_CLEAR_BLOCKS = 'plexon_ui_clear_blocks';
export const PLEXON_UI_SET_PANEL = 'plexon_ui_set_panel';

export const PLEXON_UI_RENDER_TEXT = 'plexon_ui_render_text';

const BLOCK_TYPE_DOC = UI_BLOCK_TYPES.join(' | ');

export function getPlexonUiAnthropicTools(): AnthropicTool[] {
  return [
    {
      name: PLEXON_UI_APPEND_BLOCK,
      description:
        'Append a structured UI block to the assistant message (MSQDX design system). Use after fetching data via MCP/REST.',
      input_schema: {
        type: 'object',
        properties: {
          type: { type: 'string', description: `Block type: ${BLOCK_TYPE_DOC}` },
          props: { type: 'object', description: 'Props for the block type.' },
        },
        required: ['type', 'props'],
      },
    },
    {
      name: PLEXON_UI_UPDATE_BLOCK,
      description:
        'Replace props of an existing UI block by id (e.g. refresh step_list status). Use the blockId from append_block.',
      input_schema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Block id from append_block' },
          props: { type: 'object', description: 'Full new props for the same block type' },
        },
        required: ['id', 'props'],
      },
    },
    {
      name: PLEXON_UI_CLEAR_BLOCKS,
      description: 'Clear UI blocks. Default: message blocks only.',
      input_schema: {
        type: 'object',
        properties: {
          scope: {
            type: 'string',
            description: 'message | panel | all',
          },
        },
      },
    },
    {
      name: PLEXON_UI_SET_PANEL,
      description:
        'Open/close the assistant side panel for large layouts (personas, multi-section views).',
      input_schema: {
        type: 'object',
        properties: {
          open: { type: 'boolean' },
          title: { type: 'string' },
          blocks: {
            type: 'array',
            description: 'Optional blocks to show in panel when open',
          },
        },
        required: ['open'],
      },
    },
    {
      name: PLEXON_UI_RENDER_TEXT,
      description: 'Append a markdown text block (structured alternative to free-form stream).',
      input_schema: {
        type: 'object',
        properties: {
          markdown: { type: 'string', description: 'Markdown body' },
        },
        required: ['markdown'],
      },
    },
  ];
}
