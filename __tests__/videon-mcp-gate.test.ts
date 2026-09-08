import { afterEach, describe, expect, it } from 'vitest'
import { buildVideonIntegrationContextBlock } from '@/lib/integrations/videon-connectivity'
import { resolveUseVideonMcp } from '@/lib/assistant/product-mcp-gate'
import { PLATFORM_ENTITLEMENT_STATUS } from '@/lib/platform-entitlements'

const ENV_KEY = 'VIDEON_MCP_URL'

describe('videon MCP gate', () => {
  afterEach(() => {
    delete process.env[ENV_KEY]
  })

  it('is off when URL missing', () => {
    expect(
      resolveUseVideonMcp({
        pageContext: { product: 'videon' },
        hasAnyActiveEntitlement: true,
      }),
    ).toBe(false)
  })

  it('is on for videon host when URL set', () => {
    process.env[ENV_KEY] = 'http://videon-mcp:3103'
    expect(
      resolveUseVideonMcp({
        pageContext: { product: 'videon' },
      }),
    ).toBe(true)
  })

  it('is on for sibling entitlement when URL set', () => {
    process.env[ENV_KEY] = 'http://videon-mcp:3103'
    expect(
      resolveUseVideonMcp({
        pageContext: { product: 'plexon' },
        hasAnyActiveEntitlement: true,
        videonEntitlement: { status: PLATFORM_ENTITLEMENT_STATUS.ACTIVE },
      }),
    ).toBe(true)
  })

  it('marks MCP active in connectivity block when enabled', () => {
    process.env[ENV_KEY] = 'https://videon-mcp.example/mcp'
    const block = buildVideonIntegrationContextBlock({ useVideonMcp: true })
    expect(block).toContain('aktiv')
    expect(block).toContain('videon_media_search')
  })
})
