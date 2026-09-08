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
      sceneLabel?: string
    }>
    expect(items[0].href).toBe(
      'https://videon.example/media/media-1?platformProjectId=proj-1&t=12500&scene=sc_03',
    )
    expect(items[0].posterUrl).toBe(
      '/api/assistant/videon-frame?mediaAssetId=media-1&platformProjectId=proj-1&t=12500',
    )
    expect(items[0].sceneLabel).toBe('Szene 3')
    const parsed = parseUiBlockProps('video_hit_strip', blocks[0].props)
    expect(parsed.ok).toBe(true)
    expect(blockToPlainText(blocks[0])).toContain('reel.mp4')
  })

  it('skips hits without href or project', () => {
    const blocks = buildVideonMediaSearchBlocks({
      items: [{ mediaAssetId: 'm', platformProjectId: null, href: null }],
    })
    expect(blocks).toHaveLength(0)
  })
})
