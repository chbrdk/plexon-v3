import { describe, expect, it } from 'vitest'
import {
  isParallelSafeAssistantTool,
  shouldRunAssistantToolsInParallel,
} from '@/lib/assistant/mcp-tool-parallel'
import { evaluateCreationSceneQuality, resolveCreationSceneQualityJob } from '@/lib/assistant/creation-scene-quality'
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
    const verdict = evaluateCreationSceneQuality(
      [
        { name: 'creation_scene_import_html' },
        { name: 'creation_scene_content_audit', preview: '{"ok":true}' },
        {
          name: 'creation_scene_craft_debug',
          preview:
            '{"craftFlags":[],"sceneStats":{"nodeCount":24,"hasLargeDisplay":true,"hasHeroMedia":true,"maxFontSizePx":64}}',
        },
        { name: 'creation_scene_preview', preview: '{"status":"ready"}' },
        {
          name: 'creation_scene_tree_index',
          preview: '- Hero [h1] SiteStack\n  - CTA [b1] SiteButton',
        },
      ],
      { job: 'landing', userPrompt: 'Baue eine Landing' },
    )
    expect(verdict.pass).toBe(true)
    expect(verdict.job).toBe('landing')
  })

  it('fails on fixture seed chrome for landing jobs', () => {
    const verdict = evaluateCreationSceneQuality(
      [
        { name: 'creation_scene_import_html' },
        {
          name: 'creation_scene_content_audit',
          preview:
            '{"ok":true,"findings":[{"severity":"warning","code":"generic-alt","message":"Get started still visible"}]}',
        },
        {
          name: 'creation_scene_craft_debug',
          preview:
            '{"craftFlags":[],"sceneStats":{"nodeCount":20,"hasLargeDisplay":true,"hasHeroMedia":true,"maxFontSizePx":56}}',
        },
        { name: 'creation_scene_preview', preview: '{"status":"ready"}' },
        {
          name: 'creation_scene_tree_index',
          preview: '- CTA [b1] SiteButton Get started',
        },
      ],
      { job: 'landing' },
    )
    expect(verdict.pass).toBe(false)
    expect(verdict.findings.join(' ')).toMatch(/Seed|Fixture/i)
  })

  it('fails on missing CTA when landing outline has no button/link', () => {
    const verdict = evaluateCreationSceneQuality(
      [
        { name: 'creation_scene_apply_ops' },
        { name: 'creation_scene_content_audit', preview: '{"ok":true,"findings":[]}' },
        {
          name: 'creation_scene_craft_debug',
          preview:
            '{"craftFlags":[],"sceneStats":{"nodeCount":18,"hasLargeDisplay":true,"hasHeroMedia":true,"maxFontSizePx":52}}',
        },
        { name: 'creation_scene_preview', preview: '{"status":"ready"}' },
        {
          name: 'creation_scene_tree_index',
          preview: '- Hero [h1] SiteStack\n  - Title [t1] SiteText',
        },
      ],
      { job: 'landing' },
    )
    expect(verdict.pass).toBe(false)
    expect(verdict.findings.join(' ')).toMatch(/CTA fehlt/)
  })

  it('fails on missing hero mass for landing without craft-thin flag', () => {
    const verdict = evaluateCreationSceneQuality(
      [
        { name: 'creation_scene_import_html' },
        { name: 'creation_scene_content_audit', preview: '{"ok":true,"findings":[]}' },
        {
          name: 'creation_scene_craft_debug',
          preview:
            '{"craftFlags":[],"sceneStats":{"nodeCount":20,"hasLargeDisplay":false,"hasHeroMedia":false,"maxFontSizePx":18}}',
        },
        { name: 'creation_scene_preview', preview: '{"status":"ready"}' },
        {
          name: 'creation_scene_tree_index',
          preview: '- Hero [h1] SiteStack\n  - CTA [b1] SiteButton',
        },
      ],
      { job: 'landing' },
    )
    expect(verdict.pass).toBe(false)
    expect(verdict.findings.join(' ')).toMatch(/Hero-Masse/)
  })

  it('fails landing when large display exists but hero media is missing', () => {
    const verdict = evaluateCreationSceneQuality(
      [
        { name: 'creation_scene_import_html' },
        { name: 'creation_scene_content_audit', preview: '{"ok":true,"findings":[]}' },
        {
          name: 'creation_scene_craft_debug',
          preview:
            '{"craftFlags":[],"sceneStats":{"nodeCount":24,"hasLargeDisplay":true,"hasHeroMedia":false,"maxFontSizePx":64}}',
        },
        { name: 'creation_scene_preview', preview: '{"status":"ready"}' },
        {
          name: 'creation_scene_tree_index',
          preview: '- Hero [h1] SiteStack\n  - Title [t1] SiteText\n  - CTA [b1] SiteButton',
        },
      ],
      { job: 'landing' },
    )
    expect(verdict.pass).toBe(false)
    expect(verdict.findings.join(' ')).toMatch(/Hero-Masse|Full-Bleed Media|Text-only/)
  })

  it('soft-skips preview tool errors but still blocks when preview was never called', () => {
    const withError = evaluateCreationSceneQuality(
      [
        { name: 'creation_scene_import_html' },
        { name: 'creation_scene_content_audit', preview: '{"ok":true}' },
        {
          name: 'creation_scene_craft_debug',
          preview:
            '{"craftFlags":[],"sceneStats":{"nodeCount":24,"hasLargeDisplay":true,"hasHeroMedia":true,"maxFontSizePx":64}}',
        },
        { name: 'creation_scene_preview', preview: '{"error":"playwright timeout"}' },
        {
          name: 'creation_scene_tree_index',
          preview: '- CTA [b1] SiteButton',
        },
      ],
      { job: 'generic' },
    )
    expect(withError.pass).toBe(true)

    const missing = evaluateCreationSceneQuality(
      [
        { name: 'creation_scene_import_html' },
        { name: 'creation_scene_content_audit', preview: '{"ok":true}' },
        {
          name: 'creation_scene_craft_debug',
          preview:
            '{"craftFlags":[],"sceneStats":{"nodeCount":24,"hasLargeDisplay":true,"hasHeroMedia":true,"maxFontSizePx":64}}',
        },
      ],
      { job: 'generic' },
    )
    expect(missing.pass).toBe(false)
    expect(missing.findings.join(' ')).toMatch(/preview fehlt/)
  })

  it('resolves landing job from user prompt when job=auto', () => {
    expect(resolveCreationSceneQualityJob({ userPrompt: 'Baue eine Landing mit Hero' })).toBe(
      'landing',
    )
    expect(resolveCreationSceneQualityJob({ userPrompt: 'Rename den Layer' })).toBe('generic')
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
