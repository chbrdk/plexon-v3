import { describe, expect, it } from 'vitest'
import { summarizeAssistantToolTrace } from '@/lib/assistant/tool-trace-summary'

describe('summarizeAssistantToolTrace', () => {
  it('flags Spirion library + Creation import path', () => {
    const summary = summarizeAssistantToolTrace([
      { name: 'spirion_captures_list', preview: '{"captures":[{"id":"cap_abc123"}]}' },
      {
        name: 'spirion_capture_prompt_pack',
        preview: '{"capture_run_id":"cap_abc123","look_contract":{}}',
      },
      { name: 'creation_scene_import_html', preview: '{"ok":true,"bytes":12000}' },
      { name: 'creation_scene_content_audit', preview: '{"ok":true}' },
      { name: 'creation_scene_preview', preview: '{"status":"ready"}' },
    ])

    expect(summary.tools).toEqual([
      'spirion_captures_list',
      'spirion_capture_prompt_pack',
      'creation_scene_import_html',
      'creation_scene_content_audit',
      'creation_scene_preview',
    ])
    expect(summary.spirion.capturesListCalled).toBe(true)
    expect(summary.spirion.capturePromptPackCalled).toBe(true)
    expect(summary.spirion.captureIds).toContain('cap_abc123')
    expect(summary.creation.importHtmlCalled).toBe(true)
    expect(summary.creation.contentAuditCalled).toBe(true)
    expect(summary.creation.previewCalled).toBe(true)
  })

  it('dedupes tool names and ignores empty', () => {
    const summary = summarizeAssistantToolTrace([
      { name: 'spirion_captures_list' },
      { name: 'spirion_captures_list' },
      { name: '  ' },
    ])
    expect(summary.tools).toEqual(['spirion_captures_list'])
    expect(summary.spirion.capturesListCalled).toBe(true)
    expect(summary.creation.importHtmlCalled).toBe(false)
  })
})
