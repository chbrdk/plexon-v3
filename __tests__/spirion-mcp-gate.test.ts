import { describe, expect, it } from 'vitest';
import { resolveUseSpirionMcp } from '@/lib/assistant/product-mcp-gate';
import { PLATFORM_ENTITLEMENT_STATUS } from '@/lib/platform-entitlements';
import { buildSpirionIntegrationContextBlock } from '@/lib/integrations/spirion-connectivity';
import { classifyToolFamily } from '@/lib/assistant/tool-catalog';
import { planAssistantTurnHeuristic } from '@/lib/assistant/assistant-planner';

describe('resolveUseSpirionMcp', () => {
  it('returns false when MCP URL is missing', () => {
    expect(
      resolveUseSpirionMcp({
        spirionEntitlement: { status: PLATFORM_ENTITLEMENT_STATUS.ACTIVE },
        pageContext: { product: 'spirion' },
        mcpUrl: undefined,
      }),
    ).toBe(false);
  });

  it('returns true with active entitlement', () => {
    expect(
      resolveUseSpirionMcp({
        spirionEntitlement: { status: PLATFORM_ENTITLEMENT_STATUS.ACTIVE },
        pageContext: null,
        mcpUrl: 'https://spirion-mcp.example/mcp',
      }),
    ).toBe(true);
  });

  it('returns true for Creation editor pageContext (cross-ask)', () => {
    expect(
      resolveUseSpirionMcp({
        spirionEntitlement: null,
        pageContext: { product: 'creation' },
        mcpUrl: 'https://spirion-mcp.example/mcp',
      }),
    ).toBe(true);
  });
});

describe('spirion tool catalog', () => {
  it('classifies references and screens families', () => {
    expect(classifyToolFamily('spirion_references_search')).toBe('spirion_references');
    expect(classifyToolFamily('spirion_screens_search')).toBe('spirion_screens');
    expect(classifyToolFamily('creation_scene_content_audit')).toBe('creation_scene');
  });
});

describe('spirion planner', () => {
  it('plans spirion_research for reference prompts when MCP on', () => {
    const plan = planAssistantTurnHeuristic({
      prompt: 'Suche Spirion Referenzen für E-Commerce PDP',
      hasSpirionMcp: true,
      hasCreationMcp: false,
    });
    expect(plan.intent).toBe('spirion_research');
    expect(plan.toolFamilies).toContain('spirion_references');
  });

  it('includes spirion families on creation_scene_edit when Spirion MCP on', () => {
    const plan = planAssistantTurnHeuristic({
      prompt: 'Baue eine Landing Page PDP für ein E-Bike im Editor',
      hasCreationMcp: true,
      hasSpirionMcp: true,
    });
    expect(plan.intent).toBe('creation_scene_edit');
    expect(plan.toolFamilies).toContain('spirion_references');
    expect(plan.toolFamilies).toContain('creation_scene_write');
  });
});

describe('buildSpirionIntegrationContextBlock', () => {
  it('marks MCP active when useSpirionMcp and URL set', () => {
    const prev = process.env.SPIRION_MCP_URL;
    process.env.SPIRION_MCP_URL = 'https://spirion-mcp.example/mcp';
    try {
      const block = buildSpirionIntegrationContextBlock({ useSpirionMcp: true });
      expect(block).toContain('MCP-Tools: **aktiv**');
      expect(block).toMatch(/spirion_references_search|references_search/);
    } finally {
      if (prev === undefined) delete process.env.SPIRION_MCP_URL;
      else process.env.SPIRION_MCP_URL = prev;
    }
  });
});
