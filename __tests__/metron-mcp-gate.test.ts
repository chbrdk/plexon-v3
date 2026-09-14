import { describe, expect, it } from 'vitest'
import { resolveUseMetronMcp } from '@/lib/assistant/product-mcp-gate'
import { injectMetronToolArgs } from '@/lib/assistant/metron-tool-args'
import { buildMetronIntegrationContextBlock } from '@/lib/integrations/metron-connectivity'
import { PLATFORM_ENTITLEMENT_STATUS } from '@/lib/platform-entitlements'

describe('resolveUseMetronMcp', () => {
  it('requires MCP URL', () => {
    expect(
      resolveUseMetronMcp({
        mcpUrl: undefined,
        pageContext: { product: 'metron' },
      }),
    ).toBe(false)
  })

  it('admits metron host product when URL set', () => {
    expect(
      resolveUseMetronMcp({
        mcpUrl: 'https://metron-mcp.example',
        pageContext: { product: 'metron' },
      }),
    ).toBe(true)
  })

  it('admits sibling shell host', () => {
    expect(
      resolveUseMetronMcp({
        mcpUrl: 'https://metron-mcp.example',
        pageContext: { product: 'plexon' },
      }),
    ).toBe(true)
  })

  it('admits active entitlement', () => {
    expect(
      resolveUseMetronMcp({
        mcpUrl: 'https://metron-mcp.example',
        metronEntitlement: { status: PLATFORM_ENTITLEMENT_STATUS.ACTIVE },
      }),
    ).toBe(true)
  })
})

describe('injectMetronToolArgs', () => {
  it('injects actorUserId and skips health', () => {
    expect(
      injectMetronToolArgs('metron_health', {}, { actorUserId: 'u1' }),
    ).toEqual({})
    expect(
      injectMetronToolArgs(
        'metron_dashboards_list',
        {},
        { actorUserId: 'u1', pageContext: { product: 'metron', platformProjectId: 'col-1' } },
      ),
    ).toEqual({ actorUserId: 'u1', platformProjectId: 'col-1' })
  })
})

describe('buildMetronIntegrationContextBlock', () => {
  it('mentions disabled when URL missing', () => {
    const prev = process.env.METRON_MCP_URL
    delete process.env.METRON_MCP_URL
    try {
      expect(buildMetronIntegrationContextBlock({ useMetronMcp: false })).toMatch(
        /METRON_MCP_URL fehlt/,
      )
    } finally {
      if (prev === undefined) delete process.env.METRON_MCP_URL
      else process.env.METRON_MCP_URL = prev
    }
  })
})
