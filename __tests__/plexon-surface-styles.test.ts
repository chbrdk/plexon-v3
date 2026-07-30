import { describe, expect, it } from 'vitest';
import {
  PLEXON_OFFWHITE,
  PLEXON_SURFACE_OFFWHITE_CSS,
  plexonAssistantChatShellSx,
  plexonAssistantDrawerPaperSx,
  plexonAssistantIconButtonSx,
  plexonAssistantIconSx,
  plexonAssistantStepperSx,
} from '@/lib/plexon-surface-styles';

describe('plexon-surface-styles', () => {
  it('uses MSQDX off-white neutral', () => {
    expect(PLEXON_OFFWHITE).toBe('#f8f6f0');
  });

  it('references central CSS variable for surfaces', () => {
    expect(PLEXON_SURFACE_OFFWHITE_CSS).toBe('var(--color-bg-subtle)');
  });

  it('keeps assistant chat shell on off-white not dark neutral', () => {
    expect(plexonAssistantChatShellSx.backgroundColor).toBe('var(--color-bg-subtle)');
  });

  it('forces active stepper labels to black on-light text token', () => {
    const active =
      plexonAssistantStepperSx['& .MuiStep-root .MuiStepLabel-root .MuiStepLabel-label.Mui-active'];
    expect(active).toMatchObject({ color: 'var(--color-text-on-light) !important' });
  });

  it('styles assistant drawer with theme accent border', () => {
    expect(plexonAssistantDrawerPaperSx.borderLeft).toBe('4px solid var(--color-theme-accent)');
    expect(plexonAssistantDrawerPaperSx.bgcolor).toContain('var(--color-bg-subtle)');
  });

  it('styles assistant icon buttons with theme accent', () => {
    expect(plexonAssistantIconButtonSx.color).toBe('var(--color-theme-accent) !important');
    expect(plexonAssistantIconSx.color).toBe('var(--color-theme-accent)');
    expect(plexonAssistantIconButtonSx.display).toBe('inline-flex');
  });
});
