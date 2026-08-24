import { describe, expect, it } from 'vitest'
import { resolveMcpFlagsForPlan } from '@/lib/assistant/mcp-flags-for-plan'
import {
  formatSceneTreeOutline,
  maybeCompactSceneTreeToolResult,
} from '@/lib/assistant/creation-scene-tree-outline'
import type { AssistantPlan } from '@/lib/assistant/assistant-planner'

const baseFlags = {
  useCheckionMcp: true,
  useAudionMcp: true,
  useEchonMcp: true,
  useBrandionMcp: true,
  useCreationMcp: true,
  useSpirionMcp: true,
}

function plan(intent: AssistantPlan['intent']): AssistantPlan {
  return {
    intent,
    mode: 'hybrid',
    toolFamilies: ['creation_scene'],
    allowWriteTools: true,
    maxToolRounds: 4,
    skipTools: false,
    reasoning: 'test',
    plannerSource: 'heuristic',
  }
}

describe('resolveMcpFlagsForPlan', () => {
  it('keeps Creation + Spirion MCP for scene edit', () => {
    expect(resolveMcpFlagsForPlan(plan('creation_scene_edit'), baseFlags)).toEqual({
      useCheckionMcp: false,
      useAudionMcp: false,
      useEchonMcp: false,
      useBrandionMcp: false,
      useCreationMcp: true,
      useSpirionMcp: true,
    })
  })

  it('keeps only Spirion for spirion_research', () => {
    expect(resolveMcpFlagsForPlan(plan('spirion_research'), baseFlags)).toEqual({
      useCheckionMcp: false,
      useAudionMcp: false,
      useEchonMcp: false,
      useBrandionMcp: false,
      useCreationMcp: false,
      useSpirionMcp: true,
    })
  })

  it('leaves flags unchanged for general_chat', () => {
    expect(resolveMcpFlagsForPlan(plan('general_chat'), baseFlags)).toEqual(baseFlags)
  })
})

describe('formatSceneTreeOutline', () => {
  it('renders indented outline from flat nodes', () => {
    const outline = formatSceneTreeOutline({
      sceneId: 'sc1',
      updatedAt: '2026-01-01T00:00:00.000Z',
      activePageId: 'page-home',
      nodeCount: 3,
      pages: [
        { id: 'page-home', name: 'Home' },
        { id: 'page-pdp', name: 'PDP' },
      ],
      nodes: [
        { id: 'root', type: 'frame', name: 'Page', parentId: null, index: 0, childCount: 1 },
        { id: 'teaser', type: 'instance', name: 'Hero Teaser', parentId: 'root', index: 0, childCount: 1 },
        { id: 'btn', type: 'instance', name: 'Button', parentId: 'teaser', index: 0, childCount: 0 },
      ],
    })
    expect(outline).toContain('sceneId=sc1')
    expect(outline).toContain('activePageId=page-home')
    expect(outline).toContain('pages: Home[page-home], PDP[page-pdp]')
    expect(outline).toContain('Hero Teaser [teaser]')
    expect(outline).toContain('Button [btn]')
    expect(outline!.indexOf('Hero Teaser')).toBeLessThan(outline!.indexOf('Button'))
  })

  it('compacts tree_index tool results', () => {
    const json = JSON.stringify({
      sceneId: 'sc1',
      updatedAt: 't',
      nodes: [{ id: 'a', type: 'frame', parentId: null, index: 0, childCount: 0 }],
    })
    const out = maybeCompactSceneTreeToolResult('creation_scene_tree_index', json)
    expect(out).toContain('sceneId=sc1')
    expect(out).not.toContain('"nodes"')
  })
})
