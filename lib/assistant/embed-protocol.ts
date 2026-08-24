/**
 * postMessage protocol for assistant embed ↔ host.
 * Spec: specs/api/assistant-embed.md
 */

export const ASSISTANT_EMBED_SOURCE = 'plexon-assistant-embed' as const
export const ASSISTANT_HOST_SOURCE = 'plexon-assistant-host' as const

export type AssistantEmbedToHostType =
  | 'assistant:ready'
  | 'assistant:close'
  | 'assistant:expand'
  | 'assistant:auth-required'
  | 'assistant:conversation'

export type AssistantHostToEmbedType =
  | 'assistant:context'
  | 'assistant:theme'
  | 'assistant:close'

export type AssistantEmbedMessage = {
  source: typeof ASSISTANT_EMBED_SOURCE
  type: AssistantEmbedToHostType
  conversationId?: string
  project?: string
  loginPath?: string
}

export type AssistantHostMessage = {
  source: typeof ASSISTANT_HOST_SOURCE
  type: AssistantHostToEmbedType
  product?: string
  platformProjectId?: string
  capability?: string
  pathname?: string
  entityType?: string
  entityId?: string
  entityUpdatedAt?: string
  themeId?: string
}

export function isAssistantEmbedMessage(data: unknown): data is AssistantEmbedMessage {
  if (!data || typeof data !== 'object') return false
  const row = data as Record<string, unknown>
  if (row.source !== ASSISTANT_EMBED_SOURCE) return false
  if (typeof row.type !== 'string') return false
  return (
    row.type === 'assistant:ready' ||
    row.type === 'assistant:close' ||
    row.type === 'assistant:expand' ||
    row.type === 'assistant:auth-required' ||
    row.type === 'assistant:conversation'
  )
}

export function isAssistantHostMessage(data: unknown): data is AssistantHostMessage {
  if (!data || typeof data !== 'object') return false
  const row = data as Record<string, unknown>
  if (row.source !== ASSISTANT_HOST_SOURCE) return false
  if (typeof row.type !== 'string') return false
  return (
    row.type === 'assistant:context' ||
    row.type === 'assistant:theme' ||
    row.type === 'assistant:close'
  )
}

export function postAssistantEmbedMessage(
  target: Window | null | undefined,
  targetOrigin: string,
  message: Omit<AssistantEmbedMessage, 'source'> & { source?: typeof ASSISTANT_EMBED_SOURCE },
): void {
  if (!target || !targetOrigin) return
  target.postMessage({ ...message, source: ASSISTANT_EMBED_SOURCE }, targetOrigin)
}

export function postAssistantHostMessage(
  target: Window | null | undefined,
  targetOrigin: string,
  message: Omit<AssistantHostMessage, 'source'> & { source?: typeof ASSISTANT_HOST_SOURCE },
): void {
  if (!target || !targetOrigin) return
  target.postMessage({ ...message, source: ASSISTANT_HOST_SOURCE }, targetOrigin)
}
