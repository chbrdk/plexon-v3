import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssistantChatMessage } from '@/components/assistant/AssistantMessageList'
import {
  clearStreamingAssistantContent,
  finalizeStreamingAssistantMessage,
  resolveAssistantPinMessageId,
} from '@/lib/assistant/stream-continuity'
import {
  ASSISTANT_CONTINUITY_LOG_PREFIX,
  beaconAssistantContinuityEvent,
  isEmptyAssistantDone,
  reportAssistantContinuityEvent,
} from '@/lib/assistant/stream-continuity-telemetry'
import { API_ASSISTANT_CONTINUITY } from '@/lib/constants'
import { tokensFromEvent } from '@/lib/usage-conversion'

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
    vi.unstubAllGlobals()
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

  it('reports structured continuity events and beacons', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const sendBeacon = vi.fn(() => true)
    vi.stubGlobal('navigator', { sendBeacon })

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
    expect(sendBeacon).toHaveBeenCalledWith(
      API_ASSISTANT_CONTINUITY,
      expect.any(Blob),
    )
  })

  it('falls back to keepalive fetch when sendBeacon unavailable', () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('navigator', {})
    vi.stubGlobal('fetch', fetchMock)

    beaconAssistantContinuityEvent({
      type: 'assistant_empty_done',
      conversationId: 'c-2',
      hasUiLayout: false,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      API_ASSISTANT_CONTINUITY,
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        keepalive: true,
      }),
    )
  })

  it('bills zero tokens for assistant_continuity', () => {
    expect(tokensFromEvent('assistant_continuity', { continuityType: 'assistant_empty_done' })).toBe(
      0,
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

describe('POST /api/assistant/continuity', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.doUnmock('@/lib/auth-request-user')
    vi.doUnmock('@/lib/assistant/usage')
  })

  it('rejects unauthenticated and invalid type', async () => {
    vi.doMock('@/lib/auth-request-user', () => ({
      getRequestUser: vi.fn().mockResolvedValue(null),
    }))
    vi.doMock('@/lib/assistant/usage', () => ({
      recordAssistantUsageEvent: vi.fn(),
    }))
    const { POST } = await import('@/app/api/assistant/continuity/route')
    const unauth = await POST(
      new Request('http://localhost/api/assistant/continuity', {
        method: 'POST',
        body: JSON.stringify({ type: 'assistant_empty_done' }),
      }),
    )
    expect(unauth.status).toBe(401)

    vi.resetModules()
    vi.doMock('@/lib/auth-request-user', () => ({
      getRequestUser: vi.fn().mockResolvedValue({ id: 'u1' }),
    }))
    const record = vi.fn()
    vi.doMock('@/lib/assistant/usage', () => ({
      recordAssistantUsageEvent: record,
    }))
    const { POST: POST2 } = await import('@/app/api/assistant/continuity/route')
    const bad = await POST2(
      new Request('http://localhost/api/assistant/continuity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'not_a_real_event' }),
      }),
    )
    expect(bad.status).toBe(400)
    expect(record).not.toHaveBeenCalled()
  })

  it('records usage event for valid beacon', async () => {
    vi.doMock('@/lib/auth-request-user', () => ({
      getRequestUser: vi.fn().mockResolvedValue({ id: 'u1' }),
    }))
    const record = vi.fn().mockResolvedValue(undefined)
    vi.doMock('@/lib/assistant/usage', () => ({
      recordAssistantUsageEvent: record,
    }))
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const { POST } = await import('@/app/api/assistant/continuity/route')
    const res = await POST(
      new Request('http://localhost/api/assistant/continuity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'assistant_remount_while_streaming',
          conversationId: 'c-9',
          presentation: 'expand',
          streamId: 's-1',
        }),
      }),
    )
    expect(res.status).toBe(200)
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        eventType: 'assistant_continuity',
        rawUnits: expect.objectContaining({
          continuityType: 'assistant_remount_while_streaming',
          conversationId: 'c-9',
          presentation: 'expand',
        }),
      }),
    )
    expect(spy).toHaveBeenCalledWith(
      '[assistant/continuity]',
      'assistant_remount_while_streaming',
      expect.objectContaining({ source: 'beacon', conversationId: 'c-9' }),
    )
  })
})
