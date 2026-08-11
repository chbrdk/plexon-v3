import { describe, expect, it } from 'vitest';
import {
  resolveUseAudionMcp,
  resolveUseBrandionMcp,
  resolveUseCheckionMcp,
} from '@/lib/assistant/product-mcp-gate';
import { PLATFORM_ENTITLEMENT_STATUS } from '@/lib/platform-entitlements';
import { buildBrandionIntegrationContextBlock } from '@/lib/integrations/brandion-connectivity';

describe('resolveUseProductMcp / brandion', () => {
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
        pageContext: null,
        mcpUrl: 'https://brandion-mcp.example',
      })
    ).toBe(true);
  });

  it('returns true for Brandion embed pageContext without entitlement', () => {
    expect(
      resolveUseBrandionMcp({
        brandionEntitlement: null,
        pageContext: { product: 'brandion' },
        mcpUrl: 'https://brandion-mcp.example',
      })
    ).toBe(true);
  });

  it('returns true for Plexon host (Collection cross-ask)', () => {
    expect(
      resolveUseBrandionMcp({
        brandionEntitlement: null,
        pageContext: { product: 'plexon' },
        mcpUrl: 'https://brandion-mcp.example',
      })
    ).toBe(true);
  });

  it('returns true when a sibling entitlement is active', () => {
    expect(
      resolveUseBrandionMcp({
        brandionEntitlement: null,
        pageContext: null,
        hasAnyActiveEntitlement: true,
        mcpUrl: 'https://brandion-mcp.example',
      })
    ).toBe(true);
  });

  it('returns false without URL access path', () => {
    expect(
      resolveUseBrandionMcp({
        brandionEntitlement: { status: 'inactive' },
        pageContext: null,
        hasAnyActiveEntitlement: false,
        mcpUrl: 'https://brandion-mcp.example',
      })
    ).toBe(false);
  });
});

describe('resolveUseAudionMcp', () => {
  it('enables from Brandion embed for cross-product persona+color questions', () => {
    expect(
      resolveUseAudionMcp({
        audionEntitlement: null,
        pageContext: { product: 'brandion' },
        mcpUrl: 'https://mcp-audion.example',
      })
    ).toBe(true);
  });

  it('requires URL even with entitlement', () => {
    expect(
      resolveUseAudionMcp({
        audionEntitlement: { status: PLATFORM_ENTITLEMENT_STATUS.ACTIVE },
        mcpUrl: undefined,
      })
    ).toBe(false);
  });
});

describe('resolveUseCheckionMcp', () => {
  it('enables with URL + entitlement', () => {
    expect(
      resolveUseCheckionMcp({
        checkionEntitlement: { status: PLATFORM_ENTITLEMENT_STATUS.ACTIVE },
        mcpUrl: 'https://checkion-mcp.example',
      })
    ).toBe(true);
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
});
