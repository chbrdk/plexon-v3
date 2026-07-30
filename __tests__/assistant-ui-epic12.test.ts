import { describe, expect, it } from 'vitest';
import { executePlexonUiTool } from '@/lib/assistant/ui-tools/executor';
import { UiBlockAccumulator } from '@/lib/assistant/ui-tools/accumulator';
import { PLEXON_UI_RENDER_TEXT } from '@/lib/assistant/ui-tools/definitions';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';

describe('collapsible block schema', () => {
  it('validates collapsible props', () => {
    const result = createUiBlock('collapsible', {
      title: 'Details',
      markdown: '## More info',
      defaultOpen: false,
    });
    expect(result.ok).toBe(true);
  });
});

describe('plexon_ui_render_text', () => {
  it('appends text block', () => {
    const acc = new UiBlockAccumulator();
    const result = executePlexonUiTool(PLEXON_UI_RENDER_TEXT, { markdown: 'Hello **world**' }, acc);
    expect(result.ok).toBe(true);
    expect(acc.getLayout().blocks[0]?.type).toBe('text');
  });
});
