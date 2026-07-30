import { describe, expect, it } from 'vitest';
import {
  ASSISTANT_MAX_HISTORY_MESSAGE_CHARS,
  ASSISTANT_MAX_TOOL_RESULT_CHARS,
  truncateAssistantText,
  trimMessageHistory,
} from '@/lib/assistant/context-budget';

describe('assistant context-budget', () => {
  it('truncates oversized text with notice', () => {
    const input = 'x'.repeat(100);
    const out = truncateAssistantText(input, 40, 'Test');
    expect(out.length).toBeLessThan(input.length);
    expect(out).toContain('gekürzt');
    expect(out).toContain('Test');
  });

  it('keeps short text unchanged', () => {
    expect(truncateAssistantText('hello', 100)).toBe('hello');
  });

  it('limits history message count and length', () => {
    const messages = Array.from({ length: 30 }, (_, i) => ({
      role: 'user' as const,
      content: `msg-${i}-${'a'.repeat(ASSISTANT_MAX_HISTORY_MESSAGE_CHARS + 10)}`,
    }));
    const trimmed = trimMessageHistory(messages);
    expect(trimmed.length).toBeLessThanOrEqual(20);
    expect(trimmed[0].content.length).toBeLessThanOrEqual(
      ASSISTANT_MAX_HISTORY_MESSAGE_CHARS + 80
    );
  });

  it('enforces tool result char ceiling in truncate helper', () => {
    const huge = 'z'.repeat(ASSISTANT_MAX_TOOL_RESULT_CHARS + 5000);
    const out = truncateAssistantText(huge, ASSISTANT_MAX_TOOL_RESULT_CHARS, 'Tool');
    expect(out.length).toBeLessThan(huge.length);
  });
});
