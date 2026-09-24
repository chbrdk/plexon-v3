import { describe, expect, it } from 'vitest'
import type { AssistantChatMessage } from '@/components/assistant/AssistantMessageList'
import {
  clearStreamingAssistantContent,
  finalizeStreamingAssistantMessage,
  resolveAssistantPinMessageId,
} from '@/lib/assistant/stream-continuity'

describe('stream-continuity helpers', () => {
  const streaming: AssistantChatMessage = {
    id: 'stream-1',
    role: 'assistant',
    content: 'Draft…',
    metadata: { streaming: true, contentType: 'markdown' },
  }

  it('clears content on token_reset without dropping the bubble id', () => {
    const next = clearStreamingAssistantContent(
      [{ id: 'u1', role: 'user', content: 'Hi' }, streaming],
      'stream-1',
    )
    expect(next).toHaveLength(2)
    expect(next[1]?.id).toBe('stream-1')
    expect(next[1]?.content).toBe('')
    expect((next[1]?.metadata as { streaming?: boolean }).streaming).toBe(true)
  })

  it('finalizes done text and stores serverMessageId for pins', () => {
    const next = finalizeStreamingAssistantMessage([streaming], 'stream-1', {
      text: 'Final answer',
      messageId: 'db-msg-9',
      metadata: { contentType: 'ui_composed' },
    })
    expect(next[0]?.id).toBe('stream-1')
    expect(next[0]?.content).toBe('Final answer')
    expect((next[0]?.metadata as { streaming?: boolean }).streaming).toBe(false)
    expect(resolveAssistantPinMessageId(next[0]!)).toBe('db-msg-9')
  })
})
