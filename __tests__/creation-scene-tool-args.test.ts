import { describe, expect, it } from 'vitest'
import { injectCreationSceneToolArgs } from '@/lib/assistant/creation-scene-tool-args'
import {
  ASSISTANT_CAPABILITY_CREATION_EDITOR,
  ASSISTANT_ENTITY_COMPOSITION_SCENE,
} from '@/lib/assistant/page-context'

const editorContext = {
  product: 'creation' as const,
  pathname: '/editor',
  capability: ASSISTANT_CAPABILITY_CREATION_EDITOR,
  entityType: ASSISTANT_ENTITY_COMPOSITION_SCENE,
  entityId: 'scene-abc',
  entityUpdatedAt: '2026-08-23T20:00:00.000Z',
}

describe('injectCreationSceneToolArgs', () => {
  it('injects sceneId, baseUpdatedAt, and actorUserId for apply_ops', () => {
    const out = injectCreationSceneToolArgs(
      'creation_scene_apply_ops',
      { ops: [{ op: 'insert' }] },
      { pageContext: editorContext, actorUserId: 'user-1' },
    )
    expect(out).toMatchObject({
      sceneId: 'scene-abc',
      baseUpdatedAt: '2026-08-23T20:00:00.000Z',
      actorUserId: 'user-1',
    })
  })

  it('injects sceneId for tree_index without overwriting explicit args', () => {
    const out = injectCreationSceneToolArgs(
      'creation_scene_tree_index',
      { sceneId: 'explicit', actorUserId: 'u2' },
      { pageContext: editorContext, actorUserId: 'user-1' },
    )
    expect(out.sceneId).toBe('explicit')
    expect(out.actorUserId).toBe('u2')
  })

  it('leaves unrelated tools unchanged', () => {
    const input = { foo: 'bar' }
    expect(
      injectCreationSceneToolArgs('checkion_scan_list', input, {
        pageContext: editorContext,
        actorUserId: 'user-1',
      }),
    ).toEqual(input)
  })
})
