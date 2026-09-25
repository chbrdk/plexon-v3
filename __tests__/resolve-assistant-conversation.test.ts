import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAssistantConversationById = vi.fn()
const createAssistantConversation = vi.fn()

vi.mock('@/lib/db/assistant-conversations', () => ({
  getAssistantConversationById: (...args: unknown[]) => getAssistantConversationById(...args),
  createAssistantConversation: (...args: unknown[]) => createAssistantConversation(...args),
}))

import { resolveAssistantConversationForComplete } from '@/lib/assistant/resolve-assistant-conversation'

describe('resolveAssistantConversationForComplete', () => {
  beforeEach(() => {
    getAssistantConversationById.mockReset()
    createAssistantConversation.mockReset()
  })

  it('creates when conversationId is omitted', async () => {
    createAssistantConversation.mockResolvedValue({
      id: 'new-1',
      userId: 'u1',
      title: 'Hi',
      platformProjectId: 'pp-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const result = await resolveAssistantConversationForComplete({
      userId: 'u1',
      titleSeed: 'Hi',
      platformProjectId: 'pp-1',
    })
    expect(result.created).toBe(true)
    expect(result.conversation.id).toBe('new-1')
    expect(createAssistantConversation).toHaveBeenCalled()
    expect(getAssistantConversationById).not.toHaveBeenCalled()
  })

  it('returns existing when id matches owner', async () => {
    getAssistantConversationById.mockResolvedValue({
      id: 'c1',
      userId: 'u1',
      title: 'Old',
      platformProjectId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const result = await resolveAssistantConversationForComplete({
      conversationId: 'c1',
      userId: 'u1',
      titleSeed: 'ignored',
    })
    expect(result.created).toBe(false)
    expect(result.conversation.id).toBe('c1')
    expect(createAssistantConversation).not.toHaveBeenCalled()
  })

  it('404s on unknown id instead of minting a second conversation', async () => {
    getAssistantConversationById.mockResolvedValue(null)
    await expect(
      resolveAssistantConversationForComplete({
        conversationId: 'missing',
        userId: 'u1',
        titleSeed: 'Hi',
      }),
    ).rejects.toMatchObject({ status: 404, message: 'Conversation not found' })
    expect(createAssistantConversation).not.toHaveBeenCalled()
  })

  it('forbids foreign ownership', async () => {
    getAssistantConversationById.mockResolvedValue({
      id: 'c1',
      userId: 'other',
      title: 'Nope',
      platformProjectId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await expect(
      resolveAssistantConversationForComplete({
        conversationId: 'c1',
        userId: 'u1',
        titleSeed: 'Hi',
      }),
    ).rejects.toMatchObject({ status: 403 })
    expect(createAssistantConversation).not.toHaveBeenCalled()
  })
})
