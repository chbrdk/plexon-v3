import { describe, expect, it } from 'vitest'
import { resolveUseMagcloudMcp } from '@/lib/assistant/product-mcp-gate'
import { injectMagcloudToolArgs } from '@/lib/assistant/magcloud-tool-args'
import { buildMagcloudIntegrationContextBlock } from '@/lib/integrations/magcloud-connectivity'
import { PLATFORM_ENTITLEMENT_STATUS } from '@/lib/platform-entitlements'

describe('resolveUseMagcloudMcp', () => {
  it('requires MCP URL', () => {
    expect(
      resolveUseMagcloudMcp({
        mcpUrl: undefined,
        pageContext: { product: 'magcloud' },
      }),
    ).toBe(false)
  })

  it('admits magcloud host product when URL set', () => {
    expect(
      resolveUseMagcloudMcp({
        mcpUrl: 'https://magcloud-mcp.example',
        pageContext: { product: 'magcloud' },
      }),
    ).toBe(true)
  })

  it('admits sibling shell host', () => {
    expect(
      resolveUseMagcloudMcp({
        mcpUrl: 'https://magcloud-mcp.example',
        pageContext: { product: 'plexon' },
      }),
    ).toBe(true)
  })

  it('admits active entitlement', () => {
    expect(
      resolveUseMagcloudMcp({
        mcpUrl: 'https://magcloud-mcp.example',
        magcloudEntitlement: { status: PLATFORM_ENTITLEMENT_STATUS.ACTIVE },
      }),
    ).toBe(true)
  })
})

describe('injectMagcloudToolArgs', () => {
  it('injects actorUserId and boardName from page context', () => {
    const out = injectMagcloudToolArgs(
      'magcloud_board_summarize',
      {},
      {
        actorUserId: 'user-1',
        pageContext: { product: 'magcloud', entityType: 'board', entityId: 'Pitch_A' },
      },
    )
    expect(out.actorUserId).toBe('user-1')
    expect(out.boardName).toBe('Pitch_A')
  })
})

describe('buildMagcloudIntegrationContextBlock', () => {
  it('mentions missing URL when disabled', () => {
    const prev = process.env.MAGCLOUD_MCP_URL
    delete process.env.MAGCLOUD_MCP_URL
    try {
      expect(buildMagcloudIntegrationContextBlock({ useMagcloudMcp: false })).toMatch(
        /MAGCLOUD_MCP_URL fehlt/,
      )
    } finally {
      if (prev === undefined) delete process.env.MAGCLOUD_MCP_URL
      else process.env.MAGCLOUD_MCP_URL = prev
    }
  })

  it('mentions active tools when URL set and enabled', () => {
    const prev = process.env.MAGCLOUD_MCP_URL
    process.env.MAGCLOUD_MCP_URL = 'https://magcloud-mcp.example'
    try {
      expect(buildMagcloudIntegrationContextBlock({ useMagcloudMcp: true })).toMatch(
        /MCP-Tools \*\*aktiv\*\*/,
      )
    } finally {
      if (prev === undefined) delete process.env.MAGCLOUD_MCP_URL
      else process.env.MAGCLOUD_MCP_URL = prev
    }
  })
})
