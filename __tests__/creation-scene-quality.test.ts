import { describe, expect, it } from 'vitest'
import {
  isParallelSafeAssistantTool,
  shouldRunAssistantToolsInParallel,
} from '@/lib/assistant/mcp-tool-parallel'
import { evaluateCreationSceneQuality } from '@/lib/assistant/creation-scene-quality'
import { classifyToolFamily, isDestructiveOrWriteTool } from '@/lib/assistant/tool-catalog'
import { buildMessages } from '@/lib/assistant/orchestrator-complete'

describe('mcp tool parallel safety', () => {
  it('treats Creation QA reads as parallel-safe', () => {
    expect(isParallelSafeAssistantTool('creation_scene_content_audit')).toBe(true)
    expect(isParallelSafeAssistantTool('creation_scene_craft_debug')).toBe(true)
    expect(isParallelSafeAssistantTool('creation_scene_preview')).toBe(true)
    expect(isParallelSafeAssistantTool('creation_editor_palette')).toBe(true)
    expect(isParallelSafeAssistantTool('spirion_captures_list')).toBe(true)
  })

  it('keeps scene writes serial', () => {
    expect(isParallelSafeAssistantTool('creation_scene_apply_ops')).toBe(false)
    expect(isParallelSafeAssistantTool('creation_scene_import_html')).toBe(false)
    expect(isParallelSafeAssistantTool('creation_site_kit_page_save')).toBe(false)
    expect(isParallelSafeAssistantTool('creation_site_kit_composition_save')).toBe(false)
  })

  it('parallelizes only all-read rounds', () => {
    expect(
      shouldRunAssistantToolsInParallel([
        'creation_scene_content_audit',
        'creation_scene_craft_debug',
        'creation_scene_preview',
      ]),
    ).toBe(true)
    expect(
      shouldRunAssistantToolsInParallel([
        'creation_scene_apply_ops',
        'creation_scene_tree_index',
      ]),
    ).toBe(false)
    expect(shouldRunAssistantToolsInParallel(['creation_scene_content_audit'])).toBe(false)
  })
})

describe('creation scene quality gate', () => {
  it('passes when no writes ran', () => {
    expect(
      evaluateCreationSceneQuality([{ name: 'creation_scene_tree_index' }]).pass,
    ).toBe(true)
  })

  it('blocks finish after import without audit/craft/preview', () => {
    const verdict = evaluateCreationSceneQuality([
      { name: 'creation_scene_import_html', preview: '{"ok":true}' },
    ])
    expect(verdict.pass).toBe(false)
    expect(verdict.nudge).toContain('Quality-Gate')
    expect(verdict.findings.some((f) => f.includes('content_audit'))).toBe(true)
    expect(verdict.findings.some((f) => f.includes('craft_debug'))).toBe(true)
    expect(verdict.findings.some((f) => f.includes('preview'))).toBe(true)
  })

  it('blocks craft-thin even when tools ran', () => {
    const verdict = evaluateCreationSceneQuality([
      { name: 'creation_scene_import_html' },
      { name: 'creation_scene_content_audit', preview: '{"ok":true,"findings":[]}' },
      { name: 'creation_scene_craft_debug', preview: '{"craftFlags":["craft-thin"]}' },
      { name: 'creation_scene_preview', preview: '{"status":"ready"}' },
    ])
    expect(verdict.pass).toBe(false)
    expect(verdict.findings.join(' ')).toMatch(/craft-thin/)
  })

  it('passes after audit + craft-debug + preview without errors', () => {
    const verdict = evaluateCreationSceneQuality([
      { name: 'creation_scene_import_html' },
      { name: 'creation_scene_content_audit', preview: '{"ok":true}' },
      { name: 'creation_scene_craft_debug', preview: '{"craftFlags":[]}' },
      { name: 'creation_scene_preview', preview: '{"status":"ready"}' },
    ])
    expect(verdict.pass).toBe(true)
  })
})

describe('creation quality catalog families', () => {
  it('classifies craft_debug as read and page_save as write', () => {
    expect(classifyToolFamily('creation_scene_craft_debug')).toBe('creation_scene')
    expect(classifyToolFamily('creation_site_kit_page_save')).toBe('creation_scene_write')
    expect(isDestructiveOrWriteTool('creation_site_kit_page_save')).toBe(true)
  })
})

describe('quality-gate timeline order', () => {
  it('keeps QA nudge before later tool rounds', () => {
    const messages = buildMessages(
      [],
      'Baue eine Landing',
      [
        {
          assistantContent: [{ type: 'tool_use', id: '1', name: 'creation_scene_import_html', input: {} }],
          toolResults: [{ id: '1', content: '{"ok":true}' }],
        },
        {
          assistantContent: [{ type: 'text', text: 'Fertig.' }],
          userText: '## CREATION Quality-Gate',
        },
        {
          assistantContent: [{ type: 'tool_use', id: '2', name: 'creation_scene_content_audit', input: {} }],
          toolResults: [{ id: '2', content: '{"ok":true}' }],
        },
      ],
    )
    const roles = messages.map((m) => m.role)
    expect(roles).toEqual([
      'user',
      'assistant',
      'user',
      'assistant',
      'user',
      'assistant',
      'user',
    ])
    expect(messages[4]?.content).toBe('## CREATION Quality-Gate')
  })
})
