import { describe, expect, it, vi, afterEach } from 'vitest'
import type { AssistantChatMessage } from '@/components/assistant/AssistantMessageList'
import {
  clearStreamingAssistantContent,
  finalizeStreamingAssistantMessage,
  resolveAssistantPinMessageId,
} from '@/lib/assistant/stream-continuity'
import {
  ASSISTANT_CONTINUITY_LOG_PREFIX,
  isEmptyAssistantDone,
  reportAssistantContinuityEvent,
} from '@/lib/assistant/stream-continuity-telemetry'

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

describe('stream-continuity telemetry', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('detects empty done vs text or ui layout', () => {
    expect(isEmptyAssistantDone({ text: '', metadata: null })).toBe(true)
    expect(isEmptyAssistantDone({ text: '  ', metadata: {} })).toBe(true)
    expect(isEmptyAssistantDone({ text: 'Hi', metadata: null })).toBe(false)
    expect(
      isEmptyAssistantDone({
        text: '',
        metadata: { uiLayout: { blocks: [{ id: 'b1' }] } },
      }),
    ).toBe(false)
    expect(
      isEmptyAssistantDone({
        text: '',
        metadata: { uiLayout: { blocks: [], panel: { open: true, blocks: [] } } },
      }),
    ).toBe(false)
  })

  it('reports structured continuity events', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    reportAssistantContinuityEvent({
      type: 'assistant_remount_while_streaming',
      conversationId: 'c-1',
      presentation: 'overlay',
      streamId: 'stream-1',
    })
    expect(spy).toHaveBeenCalledWith(
      ASSISTANT_CONTINUITY_LOG_PREFIX,
      'assistant_remount_while_streaming',
      expect.objectContaining({ conversationId: 'c-1', presentation: 'overlay' }),
    )
  })

  it('AssistantChat wires remount + empty-done reporters', () => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs')
    const path = require('node:path') as typeof import('node:path')
    const chat = readFileSync(
      path.join(__dirname, '../components/assistant/AssistantChat.tsx'),
      'utf8',
    )
    expect(chat).toContain('reportAssistantContinuityEvent')
    expect(chat).toContain('assistant_remount_while_streaming')
    expect(chat).toContain('assistant_empty_done')
    expect(chat).toContain('isEmptyAssistantDone')
  })
})
