import { describe, expect, it } from 'vitest';
import { buildAssistantUiShowcaseLayout } from '@/lib/assistant/ui-blocks/build-ui-showcase';
import { routeAssistantIntent } from '@/lib/assistant/intent-router';

const ALL_BLOCK_TYPES = [
  'text',
  'alert',
  'metric_grid',
  'key_value_list',
  'color_swatch_grid',
  'font_specimen_list',
  'data_table',
  'link_list',
  'summary_card',
  'step_list',
  'chart',
  'persona_card',
  'target_group_card',
  'corner_tab_section',
] as const;

describe('buildAssistantUiShowcaseLayout', () => {
  it('includes every core block type at least once', () => {
    const layout = buildAssistantUiShowcaseLayout();
    const types = layout.blocks.map((b) => b.type);
    for (const type of ALL_BLOCK_TYPES) {
      expect(types).toContain(type);
    }
  });
});

describe('ui_showcase intent', () => {
  it('detects showcase prompts', () => {
    expect(routeAssistantIntent('Zeig alle UI-Komponenten').type).toBe('ui_showcase');
    expect(routeAssistantIntent('plexon_ui blocks demo').type).toBe('ui_showcase');
    expect(routeAssistantIntent('Was kannst du?').type).toBe('capabilities');
  });
});
