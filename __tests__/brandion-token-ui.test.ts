import { describe, expect, it } from 'vitest';
import {
  buildBrandionTokenBlocks,
  isBrandionTokensListToolName,
  parseBrandionTokensListPayload,
} from '@/lib/assistant/ui-blocks/build-brandion-token-ui';
import { createUiBlock, isUiBlockType, parseUiBlockProps } from '@/lib/assistant/ui-blocks/validate';
import { blockToPlainText } from '@/lib/assistant/ui-blocks/to-plain-text';

describe('brandion token UI blocks', () => {
  it('registers color_swatch_grid and font_specimen_list', () => {
    expect(isUiBlockType('color_swatch_grid')).toBe(true);
    expect(isUiBlockType('font_specimen_list')).toBe(true);
  });

  it('validates color_swatch_grid props', () => {
    const parsed = parseUiBlockProps('color_swatch_grid', {
      title: 'Farben',
      items: [{ label: 'primary', hex: '#b638ff', path: 'color.action.primary' }],
    });
    expect(parsed.ok).toBe(true);
  });

  it('rejects invalid hex', () => {
    const parsed = parseUiBlockProps('color_swatch_grid', {
      items: [{ label: 'bad', hex: 'purple' }],
    });
    expect(parsed.ok).toBe(false);
  });

  it('parses MCP tokens_list payload and builds blocks', () => {
    const payload = parseBrandionTokensListPayload(
      JSON.stringify({
        guidelineId: 'g1',
        guidelineName: 'MSQDX',
        count: 3,
        tokens: [
          { path: 'color.action.primary', type: 'color', hex: '#b638ff' },
          { path: 'color.bad', type: 'color', hex: null },
          {
            path: 'typography.heading.h1',
            type: 'typography',
            family: 'Source Serif 4',
            weight: '600',
          },
        ],
      })
    );
    expect(payload).not.toBeNull();
    const blocks = buildBrandionTokenBlocks(payload!);
    expect(blocks.map((b) => b.type)).toEqual(['color_swatch_grid', 'font_specimen_list']);
    const color = blocks[0];
    expect(color.props.items).toHaveLength(1);
    expect(blockToPlainText(color)).toContain('#b638ff');
    expect(blockToPlainText(blocks[1])).toContain('Source Serif 4');
  });

  it('detects brandion tokens_list tool names', () => {
    expect(isBrandionTokensListToolName('brandion_tokens_list')).toBe(true);
    expect(isBrandionTokensListToolName('brandion.tokens_list')).toBe(true);
    expect(isBrandionTokensListToolName('brandion_guidelines_list')).toBe(false);
  });

  it('creates font_specimen_list via createUiBlock', () => {
    const created = createUiBlock(
      'font_specimen_list',
      {
        title: 'Schriften',
        items: [{ label: 'body', family: 'Noto Sans', weight: '400' }],
      },
      'font-1'
    );
    expect(created.ok).toBe(true);
  });
});
