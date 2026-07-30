import { describe, expect, it } from 'vitest';
import { parseAnthropicSseBlocks } from '@/lib/assistant/anthropic-stream';
import { encodeAssistantSseEvent } from '@/lib/assistant/assistant-sse';

describe('anthropic-stream', () => {
  it('accumulates text deltas', () => {
    const chunks: string[] = [];
    const raw = [
      'event: content_block_delta',
      'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hallo "}}',
      '',
      'event: content_block_delta',
      'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Welt"}}',
      '',
      'event: message_delta',
      'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}',
      '',
    ].join('\n');

    const result = parseAnthropicSseBlocks(raw, { onTextDelta: (d) => chunks.push(d) });
    expect(chunks.join('')).toBe('Hallo Welt');
    expect(result.content[0]?.text).toBe('Hallo Welt');
    expect(result.stop_reason).toBe('end_turn');
  });

  it('accumulates thinking deltas', () => {
    const thinking: string[] = [];
    const raw = [
      'event: content_block_delta',
      'data: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"Schritt 1"}}',
      '',
      'event: content_block_delta',
      'data: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":" …"}}',
      '',
      'event: content_block_stop',
      'data: {"type":"content_block_stop","index":0}',
      '',
    ].join('\n');

    const result = parseAnthropicSseBlocks(raw, { onThinkingDelta: (d) => thinking.push(d) });
    expect(thinking.join('')).toBe('Schritt 1 …');
    expect(result.content[0]?.type).toBe('thinking');
    expect(result.content[0]?.thinking).toBe('Schritt 1 …');
  });
});

describe('assistant-sse token events', () => {
  it('encodes token, thinking, and tool events', () => {
    expect(encodeAssistantSseEvent({ type: 'token', text: 'Hi' })).toContain('event: token');
    expect(encodeAssistantSseEvent({ type: 'token_reset' })).toContain('event: token_reset');
    expect(encodeAssistantSseEvent({ type: 'thinking', text: 'hmm' })).toContain('event: thinking');
    expect(encodeAssistantSseEvent({ type: 'thinking_reset' })).toContain('event: thinking_reset');
    expect(
      encodeAssistantSseEvent({ type: 'tool_call', status: 'start', name: 'checkion_scan_list' })
    ).toContain('event: tool_call');
  });
});
