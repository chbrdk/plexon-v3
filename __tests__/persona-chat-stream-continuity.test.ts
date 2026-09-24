import { describe, expect, it } from 'vitest'
import type { ChatMessage, ChatStreamEvent } from '@audion-v3/contracts'
import { applyPersonaChatStreamEvent } from '@/components/persona-chat/PersonaChatPanel'

describe('applyPersonaChatStreamEvent', () => {
  const base: ChatMessage[] = [
    {
      id: 'local-user-1',
      role: 'user',
      content: 'Hi',
      createdAt: '2026-09-24T00:00:00.000Z',
      status: 'complete',
    },
    {
      id: 'local-asst-1',
      role: 'assistant',
      content: 'Hallo ',
      createdAt: null,
      status: 'streaming',
    },
  ]

  it('appends deltas onto the streaming bubble', () => {
    const next = applyPersonaChatStreamEvent(base, 'local-asst-1', {
      type: 'delta',
      text: 'Welt',
    })
    expect(next[1]?.content).toBe('Hallo Welt')
    expect(next[1]?.id).toBe('local-asst-1')
  })

  it('keeps the local id on done and applies final text', () => {
    const done: ChatStreamEvent = {
      type: 'done',
      conversationId: 'conv-1',
      messageId: 'server-msg-should-not-become-key',
      text: 'Hallo Welt.',
    }
    const next = applyPersonaChatStreamEvent(base, 'local-asst-1', done)
    expect(next[1]?.id).toBe('local-asst-1')
    expect(next[1]?.content).toBe('Hallo Welt.')
    expect(next[1]?.status).toBe('complete')
  })
})
