/**
 * Auto-UI + write confirm for Magcloud MCP Wave 2.
 * Spec: assistant-magcloud-mcp.md
 */
import { describe, expect, it } from 'vitest'
import { isConfirmationRequiredToolName } from '@/lib/assistant/orchestrator-complete'
import {
  buildMagcloudBoardSummarizeBlocks,
  buildMagcloudBoardsListBlocks,
  buildMagcloudMetaConflictsBlocks,
  buildMagcloudSlidesSearchBlocks,
  parseMagcloudBoardSummarizePayload,
  parseMagcloudBoardsListPayload,
  parseMagcloudMetaConflictsPayload,
  parseMagcloudSlidesSearchPayload,
} from '@/lib/assistant/ui-blocks/build-magcloud-board-ui'
import { classifyToolFamily } from '@/lib/assistant/tool-catalog'

describe('magcloud write confirm', () => {
  it('requires confirm for ingest_start and meta_conflict_resolve', () => {
    expect(isConfirmationRequiredToolName('magcloud_ingest_start')).toBe(true)
    expect(isConfirmationRequiredToolName('magcloud_meta_conflict_resolve')).toBe(true)
    expect(isConfirmationRequiredToolName('magcloud_boards_list')).toBe(false)
    expect(isConfirmationRequiredToolName('magcloud_meta_conflicts_list')).toBe(false)
  })
})

describe('magcloud tool families', () => {
  it('classifies write vs boards', () => {
    expect(classifyToolFamily('magcloud_ingest_start')).toBe('magcloud_write')
    expect(classifyToolFamily('magcloud_meta_conflict_resolve')).toBe('magcloud_write')
    expect(classifyToolFamily('magcloud_meta_conflicts_list')).toBe('magcloud_boards')
  })
})

describe('magcloud auto-ui parsers', () => {
  it('builds board list link_list', () => {
    const items = parseMagcloudBoardsListPayload(
      JSON.stringify({
        boards: [{ name: 'Pitch_A', painPoints: 3, filename: 'Pitch_A.json' }],
      }),
    )
    expect(items).toHaveLength(1)
    const blocks = buildMagcloudBoardsListBlocks(items!, {
      source: 'plexon_ui',
      toolCallId: 't1',
    })
    expect(blocks[0]?.type).toBe('link_list')
  })

  it('builds summarize metric_grid', () => {
    const summary = parseMagcloudBoardSummarizePayload(
      JSON.stringify({
        name: 'Pitch_A',
        slideCount: 12,
        noteCount: 4,
        metaConflicts: 1,
      }),
    )
    expect(summary?.slideCount).toBe(12)
    const blocks = buildMagcloudBoardSummarizeBlocks(summary!, {
      source: 'plexon_ui',
      toolCallId: 't2',
    })
    expect(blocks.some((b) => b.type === 'metric_grid')).toBe(true)
  })

  it('builds slides search + conflicts', () => {
    const hits = parseMagcloudSlidesSearchPayload(
      JSON.stringify({
        hits: [{ title: 'Security', score: 0.9, boardId: 'Pitch_A' }],
      }),
    )
    expect(buildMagcloudSlidesSearchBlocks(hits!, { source: 'plexon_ui', toolCallId: 't3' })[0]?.type).toBe(
      'link_list',
    )
    const conflicts = parseMagcloudMetaConflictsPayload(
      JSON.stringify({
        boardName: 'Pitch_A',
        conflicts: [{ title: 'Slide 2', folieIndex: 2, pptxSldId: '1' }],
      }),
    )
    expect(
      buildMagcloudMetaConflictsBlocks(conflicts!, { source: 'plexon_ui', toolCallId: 't4' })[0]?.type,
    ).toBe('key_value_list')
  })
})
