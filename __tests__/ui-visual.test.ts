import { describe, expect, it } from 'vitest';
import { uiAccentColor, uiBlockShellSx, uiFindingListItemSx, uiIconCircleSx } from '@/lib/assistant/ui-visual';

describe('ui-visual theme accent', () => {
  it('resolves theme accent to CSS variable', () => {
    expect(uiAccentColor('theme')).toBe('var(--color-theme-accent)');
  });

  it('uses theme accent stripe on block shell', () => {
    const sx = uiBlockShellSx('theme');
    expect(sx.border).toContain('--color-theme-accent');
    expect(sx['&::before']?.background).toContain('--color-theme-accent');
  });

  it('uses theme accent tint on icon circle', () => {
    const sx = uiIconCircleSx('theme');
    expect(sx.bgcolor).toBe('var(--color-theme-accent-tint)');
    expect(sx.color).toBe('var(--color-theme-accent)');
  });

  it('tints finding list items with semantic green for goals', () => {
    const sx = uiFindingListItemSx('green');
    expect(sx.bgcolor).toBe('rgba(0, 202, 85, 0.12)');
    expect(sx.border).toContain('rgba');
  });
});
