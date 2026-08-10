import { describe, expect, it } from 'vitest'
import {
  PATH_ASSISTANT_EMBED,
  buildAssistantEmbedUrl,
  normalizeAssistantEmbedProduct,
  pathAssistantEmbed,
} from '@/lib/paths/assistant-embed'
import {
  ASSISTANT_EMBED_SOURCE,
  ASSISTANT_HOST_SOURCE,
  isAssistantEmbedMessage,
  isAssistantHostMessage,
} from '@/lib/assistant/embed-protocol'

describe('assistant embed paths', () => {
  it('builds embed path with required product', () => {
    expect(pathAssistantEmbed({ product: 'checkion' })).toBe(
      `${PATH_ASSISTANT_EMBED}?product=checkion`,
    )
  })

  it('normalizes unknown products', () => {
    expect(normalizeAssistantEmbedProduct('videon')).toBe('unknown')
    expect(normalizeAssistantEmbedProduct('AUDION')).toBe('audion')
  })

  it('includes project conversation capability pathname', () => {
    const href = pathAssistantEmbed({
      product: 'brandion',
      platformProjectId: 'proj-1',
      conversationId: 'c-9',
      capability: 'guidelines',
      pathname: '/guidelines',
    })
    expect(href).toContain('product=brandion')
    expect(href).toContain('project=proj-1')
    expect(href).toContain('c=c-9')
    expect(href).toContain('capability=guidelines')
    expect(href).toContain('pathname=%2Fguidelines')
  })

  it('builds absolute embed url without double slash', () => {
    expect(
      buildAssistantEmbedUrl('https://plexon-v3.example/', { product: 'plexon' }),
    ).toBe('https://plexon-v3.example/assistant/embed?product=plexon')
  })
})

describe('assistant embed protocol', () => {
  it('accepts embed→host messages', () => {
    expect(
      isAssistantEmbedMessage({
        source: ASSISTANT_EMBED_SOURCE,
        type: 'assistant:ready',
        conversationId: 'x',
      }),
    ).toBe(true)
    expect(isAssistantEmbedMessage({ source: 'other', type: 'assistant:ready' })).toBe(false)
  })

  it('accepts host→embed messages', () => {
    expect(
      isAssistantHostMessage({
        source: ASSISTANT_HOST_SOURCE,
        type: 'assistant:context',
        product: 'checkion',
      }),
    ).toBe(true)
    expect(isAssistantHostMessage({ source: ASSISTANT_EMBED_SOURCE, type: 'assistant:close' })).toBe(
      false,
    )
  })
})
