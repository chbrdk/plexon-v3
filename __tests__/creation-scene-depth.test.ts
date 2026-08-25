import { describe, expect, it, afterEach } from 'vitest'
import {
  ASSISTANT_CAPABILITY_CREATION_EDITOR,
  ASSISTANT_ENTITY_COMPOSITION_SCENE,
} from '@/lib/assistant/page-context'
import {
  buildPlanSystemPromptBlock,
  planAssistantTurnHeuristic,
} from '@/lib/assistant/assistant-planner'
import {
  buildCreationSceneDepthPromptBlock,
  getCreationSceneMaxToolRounds,
  getCreationSceneThinkingBudgetTokens,
  resolveAssistantThinkingBudgetForIntent,
} from '@/lib/assistant/creation-scene-depth'

describe('creation scene depth', () => {
  const originalRounds = process.env.ASSISTANT_CREATION_SCENE_MAX_TOOL_ROUNDS
  const originalCreationThinking = process.env.ANTHROPIC_CREATION_SCENE_THINKING_BUDGET
  const originalBaseThinking = process.env.ANTHROPIC_ASSISTANT_THINKING_BUDGET

  afterEach(() => {
    if (originalRounds === undefined) delete process.env.ASSISTANT_CREATION_SCENE_MAX_TOOL_ROUNDS
    else process.env.ASSISTANT_CREATION_SCENE_MAX_TOOL_ROUNDS = originalRounds
    if (originalCreationThinking === undefined) {
      delete process.env.ANTHROPIC_CREATION_SCENE_THINKING_BUDGET
    } else {
      process.env.ANTHROPIC_CREATION_SCENE_THINKING_BUDGET = originalCreationThinking
    }
    if (originalBaseThinking === undefined) delete process.env.ANTHROPIC_ASSISTANT_THINKING_BUDGET
    else process.env.ANTHROPIC_ASSISTANT_THINKING_BUDGET = originalBaseThinking
  })

  it('defaults to 12 tool rounds for creation_scene_edit only', () => {
    delete process.env.ASSISTANT_CREATION_SCENE_MAX_TOOL_ROUNDS
    expect(getCreationSceneMaxToolRounds()).toBe(12)

    const scene = planAssistantTurnHeuristic({
      prompt: 'Baue eine PDP Produktdetailseite im CREATION Editor Scene layout',
      hasProjectContext: false,
      hasCheckionMcp: false,
      hasAudionMcp: false,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      hasCreationMcp: true,
      compactContextLoaded: false,
    })
    expect(scene.intent).toBe('creation_scene_edit')
    expect(scene.maxToolRounds).toBe(12)

    const checkion = planAssistantTurnHeuristic({
      prompt: 'Fasse den letzten CHECKION Scan zusammen',
      hasProjectContext: true,
      hasCheckionMcp: true,
      hasAudionMcp: false,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      hasCreationMcp: false,
      compactContextLoaded: false,
    })
    expect(checkion.intent).not.toBe('creation_scene_edit')
    expect(checkion.maxToolRounds).toBeLessThan(12)
  })

  it('raises thinking budget for scene edit when base thinking is on', () => {
    delete process.env.ANTHROPIC_ASSISTANT_THINKING_BUDGET
    delete process.env.ANTHROPIC_CREATION_SCENE_THINKING_BUDGET
    expect(getCreationSceneThinkingBudgetTokens()).toBe(8192)
    expect(resolveAssistantThinkingBudgetForIntent('creation_scene_edit')).toBe(8192)
    expect(resolveAssistantThinkingBudgetForIntent('checkion_scan')).toBe(4096)
  })

  it('keeps thinking off when global budget is disabled', () => {
    process.env.ANTHROPIC_ASSISTANT_THINKING_BUDGET = 'off'
    expect(resolveAssistantThinkingBudgetForIntent('creation_scene_edit')).toBe(0)
  })

  it('adds layout-depth prompt only for writable scene-edit plans', () => {
    expect(buildCreationSceneDepthPromptBlock(false)).toBe('')
    expect(buildCreationSceneDepthPromptBlock(true)).toContain('Layout-Tiefe')
    expect(buildCreationSceneDepthPromptBlock(true)).toContain('Content-complete')
    expect(buildCreationSceneDepthPromptBlock(true)).toContain('SiteSelect')
    expect(buildCreationSceneDepthPromptBlock(true)).toContain('SiteButton')
    expect(buildCreationSceneDepthPromptBlock(true)).toContain('Get started')
    expect(buildCreationSceneDepthPromptBlock(true)).toContain('insert_child')
    expect(buildCreationSceneDepthPromptBlock(true)).toMatch(/VERBOTENE|nackte Instances/i)
    expect(buildCreationSceneDepthPromptBlock(true)).toContain('Freies Styling')
    expect(buildCreationSceneDepthPromptBlock(true)).toContain('set_prop')
    expect(buildCreationSceneDepthPromptBlock(true)).toContain('clear_token_binding')
    expect(buildCreationSceneDepthPromptBlock(true)).toMatch(/#RRGGBB|background/)
    expect(buildCreationSceneDepthPromptBlock(true)).toMatch(/Wireframe|wireframe|Fixture/)
    expect(buildCreationSceneDepthPromptBlock(true)).toContain('creation_scene_preview')
    expect(buildCreationSceneDepthPromptBlock(true)).toMatch(/var\(--|Hex\/rem\/px/)
    expect(buildCreationSceneDepthPromptBlock(true)).toContain('freistehende HTML')
    expect(buildCreationSceneDepthPromptBlock(true)).toMatch(/Eigenes Design-System|Design-System erfinden/)
    expect(buildCreationSceneDepthPromptBlock(true)).toMatch(/#ff6a3b|Noto Sans/)
    expect(buildCreationSceneDepthPromptBlock(true)).toMatch(/kein.*creation_brand_tokens_get|kein.*set_token_binding/i)

    const plan = planAssistantTurnHeuristic({
      prompt: 'Erstelle eine Hero-Section',
      hasProjectContext: false,
      hasCheckionMcp: false,
      hasAudionMcp: false,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      hasCreationMcp: true,
      compactContextLoaded: false,
      pageContext: {
        product: 'creation',
        pathname: '/editor',
        capability: ASSISTANT_CAPABILITY_CREATION_EDITOR,
        entityType: ASSISTANT_ENTITY_COMPOSITION_SCENE,
        entityId: 'scene-1',
      },
    })
    const block = buildPlanSystemPromptBlock(plan)
    expect(block).toContain('Layout-Tiefe')
    expect(block).toContain('Max. Tool-Runden: 12')
  })
})
