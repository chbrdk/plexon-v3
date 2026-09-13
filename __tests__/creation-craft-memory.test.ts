import { describe, expect, it } from 'vitest'

import {
  buildCreationCraftKnowledgeSections,
  CREATION_CRAFT_PREFS_SECTION_ID,
  CREATION_LANDING_RECIPE_SECTION_ID,
  CREATION_NEWSLETTER_RECIPE_SECTION_ID,
  CREATION_PRINT_RECIPE_SECTION_ID,
  distillCreationCraftToKnowledgePack,
  extractCreationCraftMemoryFromTraces,
} from '@/lib/assistant/knowledge-pack/distill-creation-craft'

describe('creation craft memory distill (Wave C)', () => {
  const traces = [
    { name: 'creation_scene_import_html', preview: '{"ok":true}' },
    {
      name: 'creation_scene_craft_debug',
      preview: JSON.stringify({
        craftFlags: [],
        designSystem: {
          colors: ['#1a1a1a', '#f4f0e6', '#2f6f4e'],
          fonts: ["'Fraunces', Georgia, serif"],
          gaps: ['gap:1.25rem'],
        },
        sceneStats: {
          nodeCount: 22,
          hasLargeDisplay: true,
          hasHeroMedia: false,
          maxFontSizePx: 64,
        },
      }),
    },
    {
      name: 'creation_scene_tree_index',
      preview: '- Root [r] SiteStack\n  - CTA [b] SiteButton',
    },
    { name: 'creation_scene_content_audit', preview: '{"ok":true}' },
    { name: 'creation_scene_preview', preview: '{"status":"ready"}' },
  ]

  it('extracts palette and CTA cues from tool traces', () => {
    const extract = extractCreationCraftMemoryFromTraces(traces)
    expect(extract.usedHtmlImport).toBe(true)
    expect(extract.colors).toContain('#2f6f4e')
    expect(extract.fonts[0]).toMatch(/Fraunces/)
    expect(extract.maxFontSizePx).toBe(64)
    expect(extract.hasWebCta).toBe(true)
    expect(extract.printPageCount).toBe(0)
  })

  it('builds prefs + landing recipe with stable section ids', () => {
    const extract = extractCreationCraftMemoryFromTraces(traces)
    const sections = buildCreationCraftKnowledgeSections({
      extract,
      qualityJob: 'landing',
      playbookId: 'creation_landing_v1',
      userPrompt: 'Baue eine Landing',
      sceneId: 'scene-1',
    })
    const ids = sections.map((s) => s.id)
    expect(ids).toContain(CREATION_CRAFT_PREFS_SECTION_ID)
    expect(ids).toContain(CREATION_LANDING_RECIPE_SECTION_ID)
    expect(ids).not.toContain(CREATION_NEWSLETTER_RECIPE_SECTION_ID)
    const prefs = sections.find((s) => s.id === CREATION_CRAFT_PREFS_SECTION_ID)!
    expect(prefs.plainText).toContain('format=web-landing')
    expect(prefs.plainText).toContain('#2f6f4e')
    expect(prefs.bullets?.some((b) => /Reuse accent/i.test(b))).toBe(true)
  })

  it('builds newsletter and print recipes for matching jobs', () => {
    const extract = extractCreationCraftMemoryFromTraces([
      ...traces,
      {
        name: 'creation_scene_tree_index',
        preview: '- P [p1] PrintPage\n  - Cover [c1] PrintCover\n  - P2 [p2] PrintPage',
      },
    ])
    const newsletter = buildCreationCraftKnowledgeSections({
      extract,
      qualityJob: 'newsletter',
      playbookId: 'creation_newsletter_v1',
    })
    expect(newsletter.map((s) => s.id)).toContain(CREATION_NEWSLETTER_RECIPE_SECTION_ID)
    expect(newsletter.find((s) => s.id === CREATION_NEWSLETTER_RECIPE_SECTION_ID)?.plainText).toContain(
      '560-640',
    )

    const print = buildCreationCraftKnowledgeSections({
      extract,
      qualityJob: 'print',
      playbookId: 'creation_print_magazine_v1',
    })
    expect(print.map((s) => s.id)).toContain(CREATION_PRINT_RECIPE_SECTION_ID)
    expect(print.find((s) => s.id === CREATION_PRINT_RECIPE_SECTION_ID)?.plainText).toContain(
      'printPageCount=2',
    )
  })

  it('skips publish when Collection is unbound', async () => {
    const result = await distillCreationCraftToKnowledgePack({
      platformProjectId: null,
      qualityJob: 'landing',
      playbookId: 'creation_landing_v1',
      traces,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.skipped).toBe(true)
      expect(result.error).toBe('missing-platform-project-id')
    }
  })

  it('skips publish when no scene writes ran', async () => {
    const result = await distillCreationCraftToKnowledgePack({
      platformProjectId: 'plx-collection-1',
      qualityJob: 'landing',
      traces: [{ name: 'creation_scene_tree_index', preview: 'outline' }],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.skipped).toBe(true)
      expect(result.error).toBe('no-scene-writes')
    }
  })
})
