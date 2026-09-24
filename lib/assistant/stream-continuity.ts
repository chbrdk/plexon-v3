/**
 * Helpers for keeping assistant stream bubbles stable across token_reset / done.
 * @see knowledge/central-assistant-flyout.md § First-turn remount / stream continuity
 */

import type { AssistantChatMessage } from '@/components/assistant/AssistantMessageList'

/** Clear draft tokens without dropping the bubble (token_reset). */
export function clearStreamingAssistantContent(
  messages: AssistantChatMessage[],
  streamId: string,
): AssistantChatMessage[] {
  const existing = messages.find((m) => m.id === streamId)
  if (existing) {
    return messages.map((m) =>
      m.id === streamId
        ? {
            ...m,
            content: '',
            metadata: {
              ...(m.metadata ?? {}),
              contentType: 'markdown',
              streaming: true,
            },
          }
        : m,
    )
  }
  return [
    ...messages,
    {
      id: streamId,
      role: 'assistant',
      content: '',
      metadata: { contentType: 'markdown', streaming: true },
    },
  ]
}

/** Apply done payload onto the live streaming bubble without remounting. */
export function finalizeStreamingAssistantMessage(
  messages: AssistantChatMessage[],
  streamId: string | null,
  done: { text?: string; messageId?: string; metadata?: Record<string, unknown> },
): AssistantChatMessage[] {
  return messages.map((m) => {
    const streaming = Boolean((m.metadata as { streaming?: boolean } | null)?.streaming)
    if (!streaming && m.id !== streamId) return m
    const meta: Record<string, unknown> = {
      ...(typeof m.metadata === 'object' && m.metadata ? m.metadata : {}),
      ...(done.metadata ?? {}),
      streaming: false,
    }
    if (done.messageId) meta.serverMessageId = done.messageId
    return {
      ...m,
      content: done.text?.trim() ? done.text : m.content,
      metadata: meta,
    }
  })
}

/** Prefer DB id for pins when soft-refresh kept a stable React key. */
export function resolveAssistantPinMessageId(msg: AssistantChatMessage): string {
  const serverId = msg.metadata?.serverMessageId
  return typeof serverId === 'string' && serverId ? serverId : msg.id
}
