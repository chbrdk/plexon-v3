import { describe, expect, it } from 'vitest'
import {
  extractCreationSceneUpdatedAt,
  injectAudionToolArgs,
  injectAssistantMcpToolArgs,
  injectBrandionToolArgs,
  injectCheckionToolArgs,
  injectCreationSceneToolArgs,
  injectVideonToolArgs,
} from '@/lib/assistant/creation-scene-tool-args'
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

  it('forces editor sceneId and session actorUserId on tree_index', () => {
    const out = injectCreationSceneToolArgs(
      'creation_scene_tree_index',
      { sceneId: 'explicit', actorUserId: 'cb' },
      { pageContext: editorContext, actorUserId: 'user-1' },
    )
    expect(out.sceneId).toBe('scene-abc')
    expect(out.actorUserId).toBe('user-1')
  })

  it('injects baseUpdatedAt for import_html', () => {
    const out = injectCreationSceneToolArgs(
      'creation_scene_import_html',
      { html: '<div/>' },
      { pageContext: editorContext, actorUserId: 'user-1' },
    )
    expect(out.baseUpdatedAt).toBe('2026-08-23T20:00:00.000Z')
    expect(out.sceneId).toBe('scene-abc')
  })

  it('prefers turn-local lock over pageContext entityUpdatedAt', () => {
    const out = injectCreationSceneToolArgs(
      'creation_scene_apply_ops',
      { ops: [] },
      {
        pageContext: editorContext,
        actorUserId: 'user-1',
        sceneLockUpdatedAt: '2026-08-23T21:00:00.000Z',
      },
    )
    expect(out.baseUpdatedAt).toBe('2026-08-23T21:00:00.000Z')
  })

  it('coerces stringified ops JSON into a native array for apply_ops', () => {
    const ops = [{ op: 'insert_child', parentId: 'root', child: { id: 'n1', type: 'PrintPage' } }]
    const out = injectCreationSceneToolArgs(
      'creation_scene_apply_ops',
      { ops: JSON.stringify(ops) },
      { pageContext: editorContext, actorUserId: 'user-1' },
    )
    expect(Array.isArray(out.ops)).toBe(true)
    expect(out.ops).toEqual(ops)
  })

  it('coerces set_prop prop alias to key before MCP', () => {
    const out = injectCreationSceneToolArgs(
      'creation_scene_apply_ops',
      {
        ops: [{ op: 'set_prop', nodeId: 'chip-1', prop: 'tone', value: 'accent' }],
      },
      { pageContext: editorContext, actorUserId: 'user-1' },
    )
    expect(out.ops).toEqual([
      { op: 'set_prop', nodeId: 'chip-1', prop: 'tone', key: 'tone', value: 'accent' },
    ])
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

describe('extractCreationSceneUpdatedAt', () => {
  it('reads top-level updatedAt from success payload', () => {
    expect(
      extractCreationSceneUpdatedAt(
        JSON.stringify({ updatedAt: '2026-09-09T12:00:00.000Z', appliedCount: 2 }),
      ),
    ).toBe('2026-09-09T12:00:00.000Z')
  })

  it('reads scene.updatedAt from stale-scene body', () => {
    expect(
      extractCreationSceneUpdatedAt(
        JSON.stringify({
          error: true,
          code: 'stale-scene',
          scene: { id: 's1', updatedAt: '2026-09-09T12:01:00.000Z' },
        }),
      ),
    ).toBe('2026-09-09T12:01:00.000Z')
  })

  it('chains turn-local lock across two apply_ops calls', () => {
    const pageLock = '2026-08-23T20:00:00.000Z'
    const afterFirst = '2026-08-23T20:01:00.000Z'
    let turnLock: string | null = pageLock

    const first = injectCreationSceneToolArgs(
      'creation_scene_apply_ops',
      { ops: [{ op: 'add_page' }] },
      {
        pageContext: editorContext,
        actorUserId: 'user-1',
        sceneLockUpdatedAt: turnLock,
      },
    )
    expect(first.baseUpdatedAt).toBe(pageLock)

    const extracted = extractCreationSceneUpdatedAt(
      JSON.stringify({ updatedAt: afterFirst, appliedCount: 1 }),
    )
    expect(extracted).toBe(afterFirst)
    turnLock = extracted

    const second = injectCreationSceneToolArgs(
      'creation_scene_apply_ops',
      { ops: [{ op: 'insert_child', parentId: 'root', child: { id: 'x', type: 'SiteText' } }] },
      {
        pageContext: editorContext,
        actorUserId: 'user-1',
        sceneLockUpdatedAt: turnLock,
      },
    )
    expect(second.baseUpdatedAt).toBe(afterFirst)
    expect(second.sceneId).toBe('scene-abc')
  })
})

describe('injectVideonToolArgs', () => {
  it('forces session actorUserId on media_search', () => {
    const out = injectVideonToolArgs(
      'videon_media_search',
      { q: 'dashboard', actorUserId: 'spoofed' },
      { actorUserId: 'session-user' },
    )
    expect(out.actorUserId).toBe('session-user')
    expect(out.q).toBe('dashboard')
  })

  it('injects platformProjectId onto media_search when page context has one', () => {
    const out = injectVideonToolArgs(
      'videon_media_search',
      { q: 'dashboard' },
      {
        actorUserId: 'session-user',
        pageContext: {
          product: 'videon',
          pathname: '/library',
          platformProjectId: 'proj-embed',
        },
      },
    )
    expect(out.platformProjectId).toBe('proj-embed')
  })

  it('does not override explicit platformProjectId on media_search', () => {
    const out = injectVideonToolArgs(
      'videon.media_search',
      { q: 'all', platformProjectId: 'caller-override' },
      {
        actorUserId: 'session-user',
        platformProjectId: 'conv-proj',
      },
    )
    expect(out.platformProjectId).toBe('caller-override')
  })

  it('skips health', () => {
    const input = { ping: true }
    expect(
      injectVideonToolArgs('videon_health', input, { actorUserId: 'session-user' }),
    ).toEqual(input)
  })
})

describe('injectCheckionToolArgs / injectAudionToolArgs / injectBrandionToolArgs', () => {
  it('forces session actor on checkion/audion/brandion tools', () => {
    expect(
      injectCheckionToolArgs(
        'checkion_v3.projects_list',
        { actorUserId: 'llm-spoof' },
        { actorUserId: 'session-user' },
      ).actorUserId,
    ).toBe('session-user')

    expect(
      injectAudionToolArgs('audion_projects_list', {}, { actorUserId: 'session-user' })
        .actorUserId,
    ).toBe('session-user')

    expect(
      injectBrandionToolArgs('brandion.projects_list', {}, { actorUserId: 'session-user' })
        .actorUserId,
    ).toBe('session-user')

    expect(
      injectAssistantMcpToolArgs(
        'checkion_v3.scans_list',
        { limit: 5 },
        { actorUserId: 'session-user' },
      ).actorUserId,
    ).toBe('session-user')

    expect(
      injectCheckionToolArgs('checkion_v3.health', {}, { actorUserId: 'session-user' }),
    ).toEqual({})
  })

  it('injects conversation audionProjectId and platformProjectId when model omitted them', () => {
    const out = injectAudionToolArgs(
      'audion_projects_get',
      {},
      {
        actorUserId: 'session-user',
        audionProjectId: 'aud-42',
        platformProjectId: 'pp-99',
      },
    )
    expect(out).toMatchObject({
      actorUserId: 'session-user',
      projectId: 'aud-42',
      audionProjectId: 'aud-42',
      platformProjectId: 'pp-99',
    })
  })

  it('does not overwrite explicit audion project ids from the model', () => {
    const out = injectAudionToolArgs(
      'audion_create_project',
      { projectId: 'explicit-aud', platformProjectId: 'explicit-pp' },
      {
        actorUserId: 'session-user',
        audionProjectId: 'aud-42',
        platformProjectId: 'pp-99',
      },
    )
    expect(out.projectId).toBe('explicit-aud')
    expect(out.platformProjectId).toBe('explicit-pp')
  })
})
