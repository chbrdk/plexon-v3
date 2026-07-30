import { describe, expect, it } from 'vitest';
import {
  assistantPromptOutlinedButtonSx,
  assistantSuggestionChipSx,
} from '@/lib/assistant/chat-composer-styles';

describe('assistantSuggestionChipSx', () => {
  it('uses readable light-surface colors', () => {
    expect(assistantSuggestionChipSx).toMatchObject({
      color: 'var(--color-text-on-light) !important',
      backgroundColor: 'var(--color-card-bg) !important',
      borderColor: 'var(--color-theme-accent) !important',
    });
  });
});

describe('assistantPromptOutlinedButtonSx', () => {
  it('uses theme accent instead of default green', () => {
    expect(assistantPromptOutlinedButtonSx).toMatchObject({
      borderColor: 'var(--color-theme-accent) !important',
      color: 'var(--color-text-on-light) !important',
      backgroundColor: 'var(--color-card-bg) !important',
    });
  });
});
