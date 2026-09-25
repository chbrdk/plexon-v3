/**
 * Single create path for assistant complete turns.
 * Spec: specs/domain/central-assistant-flyout.md § Conversation create
 */
import { randomUUID } from 'crypto'
import { API_STATUS } from '@/lib/api-error-handler'
import {
  createAssistantConversation,
  getAssistantConversationById,
  type StoredAssistantConversation,
} from '@/lib/db/assistant-conversations'

export type ResolveAssistantConversationResult = {
  conversation: StoredAssistantConversation
  /** True when this call minted the row (first turn without client id). */
  created: boolean
}

function statusError(message: string, status: number): Error & { status: number } {
  const err = new Error(message) as Error & { status: number }
  err.status = status
  return err
}

/**
 * Resolve an existing conversation or create one when the client omits an id.
 * A provided but unknown/foreign id MUST NOT mint a second conversation.
 */
export async function resolveAssistantConversationForComplete(input: {
  conversationId?: string | null
  userId: string
  titleSeed: string
  platformProjectId?: string | null
}): Promise<ResolveAssistantConversationResult> {
  const id = input.conversationId?.trim() || ''
  if (id) {
    const existing = await getAssistantConversationById(id)
    if (!existing) {
      throw statusError('Conversation not found', API_STATUS.NOT_FOUND)
    }
    if (existing.userId !== input.userId) {
      throw statusError('Forbidden', API_STATUS.FORBIDDEN)
    }
    return { conversation: existing, created: false }
  }

  const conversation = await createAssistantConversation({
    id: randomUUID(),
    userId: input.userId,
    title: input.titleSeed,
    platformProjectId: input.platformProjectId?.trim() || null,
  })
  return { conversation, created: true }
}
