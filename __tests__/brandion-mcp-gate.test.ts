import { describe, expect, it } from 'vitest';
import { resolveUseBrandionMcp } from '@/lib/assistant/brandion-mcp-gate';
import { PLATFORM_ENTITLEMENT_STATUS } from '@/lib/platform-entitlements';
import { buildBrandionIntegrationContextBlock } from '@/lib/integrations/brandion-connectivity';

describe('resolveUseBrandionMcp', () => {
  it('returns false when MCP URL is missing', () => {
    expect(
      resolveUseBrandionMcp({
        brandionEntitlement: { status: PLATFORM_ENTITLEMENT_STATUS.ACTIVE },
        pageContext: { product: 'brandion' },
        mcpUrl: undefined,
      })
    ).toBe(false);
  });

  it('returns true with active brandion entitlement', () => {
    expect(
      resolveUseBrandionMcp({
        brandionEntitlement: { status: PLATFORM_ENTITLEMENT_STATUS.ACTIVE },
        pageContext: { product: 'plexon' },
        mcpUrl: 'http://brandion-mcp:3100',
      })
    ).toBe(true);
  });

  it('returns true for Brandion embed pageContext without entitlement', () => {
    expect(
      resolveUseBrandionMcp({
        brandionEntitlement: null,
        pageContext: { product: 'brandion' },
        mcpUrl: 'http://brandion-mcp:3100',
      })
    ).toBe(true);
  });

  it('returns false without entitlement and non-brandion product', () => {
    expect(
      resolveUseBrandionMcp({
        brandionEntitlement: { status: 'inactive' },
        pageContext: { product: 'plexon' },
        mcpUrl: 'http://brandion-mcp:3100',
      })
    ).toBe(false);
  });
});

describe('buildBrandionIntegrationContextBlock', () => {
  it('marks MCP active when useBrandionMcp is true and URL is set', () => {
    const prev = process.env.BRANDION_MCP_URL;
    process.env.BRANDION_MCP_URL = 'https://brandion-mcp.example/mcp';
    try {
      const block = buildBrandionIntegrationContextBlock({ useBrandionMcp: true });
      expect(block).toContain('MCP-Tools: **aktiv**');
      expect(block).toContain('brandion_tokens_list');
    } finally {
      if (prev === undefined) delete process.env.BRANDION_MCP_URL;
      else process.env.BRANDION_MCP_URL = prev;
    }
  });

  it('explains entitlement/product gate when URL set but useBrandionMcp false', () => {
    const prev = process.env.BRANDION_MCP_URL;
    process.env.BRANDION_MCP_URL = 'https://brandion-mcp.example/mcp';
    try {
      const block = buildBrandionIntegrationContextBlock({ useBrandionMcp: false });
      expect(block).toContain('deaktiviert');
      expect(block).toMatch(/Entitlement|Host-Produkt/i);
    } finally {
      if (prev === undefined) delete process.env.BRANDION_MCP_URL;
      else process.env.BRANDION_MCP_URL = prev;
    }
  });
});
