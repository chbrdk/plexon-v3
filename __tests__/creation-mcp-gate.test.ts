import { describe, expect, it } from 'vitest'
import {
  resolveUseCreationMcp,
} from '@/lib/assistant/product-mcp-gate'
import { PLATFORM_ENTITLEMENT_STATUS } from '@/lib/platform-entitlements'
import { buildCreationIntegrationContextBlock } from '@/lib/integrations/creation-connectivity'
import { classifyToolFamily } from '@/lib/assistant/tool-catalog'
import { planAssistantTurnHeuristic } from '@/lib/assistant/assistant-planner'

describe('resolveUseCreationMcp', () => {
  it('returns false when MCP URL is missing', () => {
    expect(
      resolveUseCreationMcp({
        creationEntitlement: { status: PLATFORM_ENTITLEMENT_STATUS.ACTIVE },
        pageContext: { product: 'creation' },
        mcpUrl: undefined,
      })
    ).toBe(false)
  })

  it('returns true with active creation entitlement', () => {
    expect(
      resolveUseCreationMcp({
        creationEntitlement: { status: PLATFORM_ENTITLEMENT_STATUS.ACTIVE },
        pageContext: null,
        mcpUrl: 'https://creation-mcp.example',
      })
    ).toBe(true)
  })

  it('returns true for Creation embed pageContext', () => {
    expect(
      resolveUseCreationMcp({
        creationEntitlement: null,
        pageContext: { product: 'creation' },
        mcpUrl: 'https://creation-mcp.example',
      })
    ).toBe(true)
  })
})

describe('creation tool catalog + planner', () => {
  it('classifies creation_library_catalog', () => {
    expect(classifyToolFamily('creation_library_catalog')).toBe('creation_library')
    expect(classifyToolFamily('creation_compositions_list')).toBe('creation_compositions')
    expect(classifyToolFamily('creation_projects_list')).toBe('creation_projects')
    expect(classifyToolFamily('creation_scene_tree_index')).toBe('creation_scene')
    expect(classifyToolFamily('creation_scene_apply_ops')).toBe('creation_scene_write')
  })

  it('mentions valid insert ops in connectivity block', () => {
    const prev = process.env.CREATION_MCP_URL
    process.env.CREATION_MCP_URL = 'https://creation-mcp.example'
    try {
      const block = buildCreationIntegrationContextBlock({ useCreationMcp: true })
      expect(block).toContain('insert_child')
      expect(block).toContain('insert_instance')
      expect(block).toContain('add_page')
      expect(block).toContain('Niemals insert_node')
    } finally {
      if (prev === undefined) delete process.env.CREATION_MCP_URL
      else process.env.CREATION_MCP_URL = prev
    }
  })

  it('plans creation_design for library prompts when MCP on', () => {
    const plan = planAssistantTurnHeuristic({
      prompt: 'Welche ds-button Props hat die CREATION library?',
      hasProjectContext: false,
      hasCheckionMcp: false,
      hasAudionMcp: false,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      hasCreationMcp: true,
      compactContextLoaded: false,
    })
    expect(plan.intent).toBe('creation_design')
  })

  it('plans creation_scene_edit for layout prompts when MCP on', () => {
    const plan = planAssistantTurnHeuristic({
      prompt: 'Erstelle mir eine Hero-Section im CREATION Editor Scene layout',
      hasProjectContext: false,
      hasCheckionMcp: false,
      hasAudionMcp: false,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      hasCreationMcp: true,
      compactContextLoaded: false,
    })
    expect(plan.intent).toBe('creation_scene_edit')
    expect(plan.toolFamilies).toContain('creation_scene')
    expect(plan.allowWriteTools).toBe(true)
    expect(plan.maxToolRounds).toBeGreaterThanOrEqual(12)
  })
})

describe('creation connectivity block', () => {
  it('mentions missing URL', () => {
    const prev = process.env.CREATION_MCP_URL
    delete process.env.CREATION_MCP_URL
    try {
      const block = buildCreationIntegrationContextBlock({ useCreationMcp: false })
      expect(block).toMatch(/CREATION_MCP_URL fehlt/)
    } finally {
      if (prev === undefined) delete process.env.CREATION_MCP_URL
      else process.env.CREATION_MCP_URL = prev
    }
  })
})
