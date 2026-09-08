import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  buildVideonMediaSearchBlocks,
  isVideonMediaSearchToolName,
  parseVideonMediaSearchPayload,
} from '@/lib/assistant/ui-blocks/build-videon-media-search-ui'
import { isUiBlockType, parseUiBlockProps } from '@/lib/assistant/ui-blocks/validate'
import { blockToPlainText } from '@/lib/assistant/ui-blocks/to-plain-text'

describe('videon media search UI blocks', () => {
  const prev = process.env.NEXT_PUBLIC_VIDEON_URL

  beforeEach(() => {
    process.env.NEXT_PUBLIC_VIDEON_URL = 'https://videon.example'
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_VIDEON_URL = prev
  })

  it('registers video_hit_strip', () => {
    expect(isUiBlockType('video_hit_strip')).toBe(true)
  })

  it('normalizes tool names', () => {
    expect(isVideonMediaSearchToolName('videon.media_search')).toBe(true)
    expect(isVideonMediaSearchToolName('videon_media_search')).toBe(true)
    expect(isVideonMediaSearchToolName('videon_media_list')).toBe(false)
  })

  it('parses MCP payload and builds absolute hrefs + poster proxy', () => {
    const payload = parseVideonMediaSearchPayload(
      JSON.stringify({
        query: 'dashboard',
        count: 1,
        items: [
          {
            id: 'hit-1',
            mediaAssetId: 'media-1',
            sceneKey: 'sc_03',
            mediaFilename: 'reel.mp4',
            startMs: 12500,
            endMs: 18000,
            platformProjectId: 'proj-1',
            projectName: 'Demo',
            searchText: 'Dashboard UI',
            href: '/media/media-1?platformProjectId=proj-1&t=12500&scene=sc_03',
          },
        ],
      }),
    )
    expect(payload?.items).toHaveLength(1)
    const blocks = buildVideonMediaSearchBlocks(payload!)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('video_hit_strip')
    const items = blocks[0].props.items as Array<{
      href: string
      posterUrl?: string
      previewUrl?: string
      sceneLabel?: string
      actions?: Array<{ kind: string }>
    }>
    expect(items[0].href).toBe(
      'https://videon.example/media/media-1?platformProjectId=proj-1&t=12500&scene=sc_03',
    )
    expect(items[0].posterUrl).toBe(
      '/api/assistant/videon-frame?mediaAssetId=media-1&platformProjectId=proj-1&t=12500',
    )
    expect(items[0].previewUrl).toBe(
      '/api/assistant/videon-preview?mediaAssetId=media-1&platformProjectId=proj-1&t=12500',
    )
    expect(items[0].sceneLabel).toBe('Szene 3')
    expect(items[0].actions?.map((a) => a.kind)).toEqual([
      'open',
      'analysis_run',
      'brand_check_run',
      'cut_create',
    ])
    const parsed = parseUiBlockProps('video_hit_strip', blocks[0].props)
    expect(parsed.ok).toBe(true)
    expect(blockToPlainText(blocks[0])).toContain('reel.mp4')
  })

  it('includes filmstrip when multiple hits share media', () => {
    const blocks = buildVideonMediaSearchBlocks({
      items: [
        {
          id: 'a',
          mediaAssetId: 'media-1',
          sceneKey: 'sc_01',
          mediaFilename: 'reel.mp4',
          startMs: 1000,
          endMs: 2000,
          platformProjectId: 'proj-1',
          href: '/media/media-1?platformProjectId=proj-1&t=1000',
        },
        {
          id: 'b',
          mediaAssetId: 'media-1',
          sceneKey: 'sc_02',
          mediaFilename: 'reel.mp4',
          startMs: 5000,
          endMs: 6000,
          platformProjectId: 'proj-1',
          href: '/media/media-1?platformProjectId=proj-1&t=5000',
        },
      ],
    })
    const items = blocks[0].props.items as Array<{ filmstrip?: unknown[] }>
    expect(items[0].filmstrip).toHaveLength(2)
    const parsed = parseUiBlockProps('video_hit_strip', blocks[0].props)
    expect(parsed.ok).toBe(true)
  })

  it('skips hits without href or project', () => {
    const blocks = buildVideonMediaSearchBlocks({
      items: [{ mediaAssetId: 'm', platformProjectId: null, href: null }],
    })
    expect(blocks).toHaveLength(0)
  })
})
