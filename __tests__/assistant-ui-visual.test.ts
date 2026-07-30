import { describe, expect, it } from 'vitest';
import {
  UI_BRAND_HEX,
  UI_TONE_BRAND,
  brandTint,
  uiBlockShellSx,
  uiEntityCardSx,
} from '@/lib/assistant/ui-visual';

describe('ui-visual', () => {
  it('maps tones to brand colors', () => {
    expect(UI_TONE_BRAND.success).toBe('green');
    expect(UI_TONE_BRAND.info).toBe('neutral');
  });

  it('uses MSQDX brand hex values', () => {
    expect(UI_BRAND_HEX.purple).toMatch(/^#/);
    expect(UI_BRAND_HEX.pink).toMatch(/^#/);
  });

  it('entity cards use off-white surface not dark paper', () => {
    const sx = uiEntityCardSx('purple', false);
    expect(sx.bgcolor).toBe('var(--color-card-bg) !important');
    expect(sx.color).toBe('var(--color-text-on-light)');
  });

  it('neutral block shells use grey border without brand stripe', () => {
    const sx = uiBlockShellSx('neutral');
    expect(sx.border).toContain('grey');
    expect(sx['&::before'].background).toMatch(/0\.07/);
  });

  it('block shells include accent stripe pseudo-element', () => {
    const sx = uiBlockShellSx('green');
    expect(sx['&::before']).toBeDefined();
    expect(sx['&::before'].height).toBe(4);
    expect(sx.backdropFilter).toBe('none');
  });

  it('brandTint returns rgba string', () => {
    expect(brandTint('orange', 0.2)).toMatch(/rgba?\(/);
  });
});
