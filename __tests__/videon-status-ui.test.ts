import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  buildVideonAnalysisGetBlocks,
  buildVideonMediaGetBlocks,
  isVideonAnalysisGetToolName,
  isVideonMediaGetToolName,
  parseVideonAnalysisGetPayload,
  parseVideonMediaGetPayload,
} from '@/lib/assistant/ui-blocks/build-videon-status-ui'
import { isUiBlockType, parseUiBlockProps } from '@/lib/assistant/ui-blocks/validate'
import { blockToPlainText } from '@/lib/assistant/ui-blocks/to-plain-text'

describe('videon status UI blocks', () => {
  const prev = process.env.NEXT_PUBLIC_VIDEON_URL

  beforeEach(() => {
    process.env.NEXT_PUBLIC_VIDEON_URL = 'https://videon.example'
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_VIDEON_URL = prev
  })

  it('registers video_status_card', () => {
    expect(isUiBlockType('video_status_card')).toBe(true)
  })

  it('normalizes tool names', () => {
    expect(isVideonMediaGetToolName('videon.media_get')).toBe(true)
    expect(isVideonAnalysisGetToolName('videon_analysis_get')).toBe(true)
    expect(isVideonMediaGetToolName('videon_media_search')).toBe(false)
  })

  it('builds media_get status card', () => {
    const payload = parseVideonMediaGetPayload(
      JSON.stringify({
        media: {
          id: 'media-1',
          originalFilename: 'reel.mp4',
          lifecycleState: 'ready',
          durationMs: 12000,
        },
        analysis: { id: 'an-1', status: 'succeeded' },
        sceneCount: 4,
        href: '/media/media-1?platformProjectId=proj-1',
      }),
    )
    expect(payload?.media?.id).toBe('media-1')
    const blocks = buildVideonMediaGetBlocks(payload!)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('video_status_card')
    const parsed = parseUiBlockProps('video_status_card', blocks[0].props)
    expect(parsed.ok).toBe(true)
    expect(blockToPlainText(blocks[0])).toContain('Lifecycle')
    expect(blocks[0].props.href).toBe(
      'https://videon.example/media/media-1?platformProjectId=proj-1',
    )
  })

  it('builds analysis_get status card with stages', () => {
    const payload = parseVideonAnalysisGetPayload(
      JSON.stringify({
        platformProjectId: 'proj-1',
        items: [
          {
            id: 'run-1',
            status: 'running',
            mediaAssetId: 'media-1',
            stages: [
              { stageKey: 'ingest', status: 'done' },
              { stageKey: 'scenes', status: 'running' },
            ],
          },
        ],
      }),
    )
    const blocks = buildVideonAnalysisGetBlocks(payload!)
    expect(blocks).toHaveLength(1)
    const steps = blocks[0].props.steps as Array<{ id: string; status?: string }>
    expect(steps).toHaveLength(2)
    expect(steps[0].status).toBe('done')
    expect(steps[1].status).toBe('running')
    const parsed = parseUiBlockProps('video_status_card', blocks[0].props)
    expect(parsed.ok).toBe(true)
  })
})
