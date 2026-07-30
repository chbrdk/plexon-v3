import { describe, expect, it } from 'vitest';
import { UiBlockAccumulator } from '@/lib/assistant/ui-tools/accumulator';
import { executePlexonUiTool } from '@/lib/assistant/ui-tools/executor';
import { PLEXON_UI_APPEND_BLOCK, PLEXON_UI_CLEAR_BLOCKS } from '@/lib/assistant/ui-tools/definitions';

describe('ui-tools executor', () => {
  it('appends and clears blocks', () => {
    const acc = new UiBlockAccumulator();
    const append = executePlexonUiTool(
      PLEXON_UI_APPEND_BLOCK,
      {
        type: 'metric_grid',
        props: { items: [{ label: 'A', value: 1 }] },
      },
      acc
    );
    expect(append.ok).toBe(true);
    expect(acc.blockCount).toBe(1);

    const cleared = executePlexonUiTool(PLEXON_UI_CLEAR_BLOCKS, {}, acc);
    expect(cleared.ok).toBe(true);
    expect(cleared.cleared).toBe(true);
    expect(acc.blockCount).toBe(0);
  });

  it('returns error for unknown block type', () => {
    const acc = new UiBlockAccumulator();
    const result = executePlexonUiTool(
      PLEXON_UI_APPEND_BLOCK,
      { type: 'not_a_block', props: {} },
      acc
    );
    expect(result.ok).toBe(false);
  });

  it('enforces max blocks', () => {
    const acc = new UiBlockAccumulator();
    for (let i = 0; i < 12; i += 1) {
      executePlexonUiTool(
        PLEXON_UI_APPEND_BLOCK,
        { type: 'alert', props: { message: `m${i}` } },
        acc
      );
    }
    const overflow = executePlexonUiTool(
      PLEXON_UI_APPEND_BLOCK,
      { type: 'alert', props: { message: 'one too many' } },
      acc
    );
    expect(overflow.ok).toBe(false);
  });
});
