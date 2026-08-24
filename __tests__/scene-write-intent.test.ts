import { describe, expect, it } from 'vitest'
import {
  ASSISTANT_CAPABILITY_CREATION_EDITOR,
  ASSISTANT_ENTITY_COMPOSITION_SCENE,
} from '@/lib/assistant/page-context'
import {
  hasCreationEditorSceneContext,
  hasSceneWriteIntent,
} from '@/lib/assistant/scene-write-intent'
import { planAssistantTurnHeuristic } from '@/lib/assistant/assistant-planner'
import { isDestructiveOrWriteTool } from '@/lib/assistant/tool-catalog'
import { toolAllowedByPlan } from '@/lib/assistant/assistant-planner'

describe('scene write intent', () => {
  const editorContext = {
    product: 'creation' as const,
    pathname: '/editor',
    capability: ASSISTANT_CAPABILITY_CREATION_EDITOR,
    entityType: ASSISTANT_ENTITY_COMPOSITION_SCENE,
    entityId: 'scene-1',
    entityUpdatedAt: '2026-08-23T20:00:00.000Z',
  }

  it('detects German insert/edit verbs', () => {
    expect(hasSceneWriteIntent('Füge zwei Buttons in den Teaser ein')).toBe(true)
    expect(hasSceneWriteIntent('Bitte die Hero-Section anpassen')).toBe(true)
  })

  it('detects short confirm in editor context', () => {
    expect(hasSceneWriteIntent('ja', editorContext)).toBe(true)
    expect(hasSceneWriteIntent('ok', editorContext)).toBe(false)
  })

  it('recognizes editor scene context', () => {
    expect(hasCreationEditorSceneContext(editorContext)).toBe(true)
    expect(hasCreationEditorSceneContext({ product: 'creation', pathname: '/editor' })).toBe(false)
  })

  it('enables write tools for einfügen prompt in editor', () => {
    const plan = planAssistantTurnHeuristic({
      prompt: 'Zwei Button-Komponenten einfügen: Mehr erfahren + Kontakt',
      hasProjectContext: false,
      hasCheckionMcp: false,
      hasAudionMcp: false,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      hasCreationMcp: true,
      compactContextLoaded: false,
      pageContext: editorContext,
    })
    expect(plan.intent).toBe('creation_scene_edit')
    expect(plan.allowWriteTools).toBe(true)
  })

  it('blocks scene write tools when plan disallows writes', () => {
    expect(isDestructiveOrWriteTool('creation_scene_apply_ops')).toBe(true)
    expect(isDestructiveOrWriteTool('creation_scene_import_html')).toBe(true)
    const plan = planAssistantTurnHeuristic({
      prompt: 'Was steht in der Scene?',
      hasProjectContext: false,
      hasCheckionMcp: false,
      hasAudionMcp: false,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      hasCreationMcp: true,
      compactContextLoaded: false,
      pageContext: editorContext,
    })
    expect(toolAllowedByPlan('creation_scene_apply_ops', plan)).toBe(false)
    expect(toolAllowedByPlan('creation_scene_tree_index', plan)).toBe(true)
  })
})
