import { describe, expect, it } from 'vitest';
import {
  ASSISTANT_CHAT_BUBBLE_COLORS,
  ASSISTANT_CHAT_BUBBLE_MAX_WIDTH,
  getGlassChatBubbleAlign,
  getGlassChatBubbleMaxWidth,
  getGlassChatBubbleSx,
  getGlassChatLabelColor,
} from '@/lib/assistant/glass-chat-bubbles';

const mockTheme = {
  palette: { mode: 'dark' as const, text: { primary: '#fff' } },
};

describe('glass-chat-bubbles', () => {
  it('exposes AUDION-aligned border tokens', () => {
    expect(ASSISTANT_CHAT_BUBBLE_COLORS.userBorder).toBe('var(--color-secondary-dx-orange)');
    expect(ASSISTANT_CHAT_BUBBLE_COLORS.assistantBorder).toBe('var(--color-secondary-dx-pink)');
    expect(ASSISTANT_CHAT_BUBBLE_COLORS.surface).toBe('var(--color-bg-subtle)');
  });

  it('aligns user bubbles to the end', () => {
    expect(getGlassChatBubbleAlign('user')).toBe('flex-end');
    expect(getGlassChatBubbleAlign('assistant')).toBe('flex-start');
  });

  it('maps label colors per role', () => {
    expect(getGlassChatLabelColor('user')).toBe(ASSISTANT_CHAT_BUBBLE_COLORS.userBorder);
    expect(getGlassChatLabelColor('assistant')).toBe(ASSISTANT_CHAT_BUBBLE_COLORS.assistantBorder);
    expect(getGlassChatLabelColor('system')).toBe(ASSISTANT_CHAT_BUBBLE_COLORS.systemBorder);
  });

  it('gives assistant bubbles two-thirds width on desktop', () => {
    expect(ASSISTANT_CHAT_BUBBLE_MAX_WIDTH.assistant.md).toBe('66.67%');
    expect(getGlassChatBubbleMaxWidth('assistant').md).toBe('66.67%');
  });

  it('uses asymmetric radii like AUDION glass chat', () => {
    const user = getGlassChatBubbleSx('user', mockTheme);
    const assistant = getGlassChatBubbleSx('assistant', mockTheme);
    expect(user.borderRadius).toBe('36px 12px 36px 36px');
    expect(assistant.borderRadius).toBe('12px 44px 44px 44px');
    expect(user.background).toBe('var(--color-bg-subtle)');
    expect(assistant.background).toBe('var(--color-bg-subtle)');
  });
});
