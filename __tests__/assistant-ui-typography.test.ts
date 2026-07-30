import { describe, expect, it } from 'vitest';
import { MSQDX_TYPOGRAPHY } from '@msqdx/tokens';
import {
  UI_BLOCK_ICONS,
  UI_FONT_MONO,
  UI_FONT_SANS,
  uiBlockIconForTone,
  uiBlockBrandForTone,
} from '@/lib/assistant/ui-typography';

describe('ui-typography', () => {
  it('uses MSQDX Noto Sans as primary UI font', () => {
    expect(UI_FONT_SANS).toBe(MSQDX_TYPOGRAPHY.fontFamily.primary);
    expect(UI_FONT_SANS).toContain('Noto Sans');
  });

  it('defines mono via CSS variable', () => {
    expect(UI_FONT_MONO).toBe('var(--font-ui-mono)');
  });

  it('maps every block type to a Material icon', () => {
    expect(UI_BLOCK_ICONS.target_group_card).toBe('groups');
    expect(UI_BLOCK_ICONS.persona_card).toBe('face');
    expect(UI_BLOCK_ICONS.metric_grid).toBe('dashboard');
  });

  it('maps alert tones to icons and brand colors', () => {
    expect(uiBlockIconForTone('success')).toBe('check_circle');
    expect(uiBlockBrandForTone('warning')).toBe('orange');
  });
});
