import { describe, expect, it, afterEach } from 'vitest';
import { getAssistantThinkingBudgetTokens } from '@/lib/constants';

describe('getAssistantThinkingBudgetTokens', () => {
  const original = process.env.ANTHROPIC_ASSISTANT_THINKING_BUDGET;

  afterEach(() => {
    if (original === undefined) delete process.env.ANTHROPIC_ASSISTANT_THINKING_BUDGET;
    else process.env.ANTHROPIC_ASSISTANT_THINKING_BUDGET = original;
  });

  it('defaults to 4096 when unset', () => {
    delete process.env.ANTHROPIC_ASSISTANT_THINKING_BUDGET;
    expect(getAssistantThinkingBudgetTokens()).toBe(4096);
  });

  it('returns 0 when disabled', () => {
    process.env.ANTHROPIC_ASSISTANT_THINKING_BUDGET = 'off';
    expect(getAssistantThinkingBudgetTokens()).toBe(0);
  });

  it('parses custom budget', () => {
    process.env.ANTHROPIC_ASSISTANT_THINKING_BUDGET = '2048';
    expect(getAssistantThinkingBudgetTokens()).toBe(2048);
  });
});
