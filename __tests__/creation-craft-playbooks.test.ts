import { describe, expect, it } from 'vitest'
import {
  buildCreationCraftPlaybookPromptBlock,
  listCreationCraftPlaybooks,
  promptLooksLikeWireframeBrief,
  qualityJobForCreationCraftPlaybook,
  resolveCreationCraftPlaybook,
} from '@/lib/assistant/creation-craft-playbooks'
import { evaluateCreationSceneQuality } from '@/lib/assistant/creation-scene-quality'
import { buildCreationSceneDepthPromptBlock } from '@/lib/assistant/creation-scene-depth'
import { planAssistantTurnHeuristic } from '@/lib/assistant/assistant-planner'

describe('creation craft playbooks (Wave B)', () => {
  it('lists multi-format catalog including newsletter and print', () => {
    const ids = listCreationCraftPlaybooks().map((p) => p.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'creation_landing_v1',
        'creation_newsletter_v1',
        'creation_print_magazine_v1',
        'creation_print_report_v1',
        'creation_page_as_pattern_v1',
      ]),
    )
  })

  it('resolves landing phrasing', () => {
    expect(resolveCreationCraftPlaybook('Baue eine Landing mit Hero')?.id).toBe(
      'creation_landing_v1',
    )
    expect(qualityJobForCreationCraftPlaybook('creation_landing_v1')).toBe('landing')
  })

  it('landing playbook defaults to full-bleed backgroundImage overlay hero', () => {
    const landing = buildCreationCraftPlaybookPromptBlock('creation_landing_v1')
    expect(landing).toContain('Default Hero')
    expect(landing).toContain('background-image')
    expect(landing).toContain('ignored-absolute-position')
    expect(landing).toContain('activeBreakpoint=desktop')
    expect(landing).toContain('Wireframe / Skizze = Layout-Vertrag')
    expect(landing).toContain('Zeichenlimits')
    const depth = buildCreationSceneDepthPromptBlock(true, {
      playbookId: 'creation_landing_v1',
    })
    expect(depth).toContain('Default Hero')
    expect(depth).toContain('background-image')
    expect(depth).toContain('Wireframe / Skizze = Layout-Vertrag')
  })

  it('resolves wireframe / skizze phrasing to landing playbook', () => {
    expect(resolveCreationCraftPlaybook('Setze dieses Wireframe als Landing um')?.id).toBe(
      'creation_landing_v1',
    )
    expect(resolveCreationCraftPlaybook('Bioframe Skizze umsetzen')?.id).toBe(
      'creation_landing_v1',
    )
    expect(promptLooksLikeWireframeBrief('Hier ein Wireframe — bitte so bauen')).toBe(true)
    expect(promptLooksLikeWireframeBrief('Restyle dichter')).toBe(false)
  })

  it('resolves newsletter / email phrasing', () => {
    expect(resolveCreationCraftPlaybook('Gestalte einen Newsletter für die Kampagne')?.id).toBe(
      'creation_newsletter_v1',
    )
    expect(resolveCreationCraftPlaybook('HTML email template with CTA')?.id).toBe(
      'creation_newsletter_v1',
    )
    expect(qualityJobForCreationCraftPlaybook('creation_newsletter_v1')).toBe('newsletter')
  })

  it('resolves print magazine vs print report', () => {
    expect(resolveCreationCraftPlaybook('PrintPage Magazin Cover und Chapter')?.id).toBe(
      'creation_print_magazine_v1',
    )
    expect(resolveCreationCraftPlaybook('Broschüre DIN A4 Drucklayout')?.id).toBe(
      'creation_print_magazine_v1',
    )
    expect(resolveCreationCraftPlaybook('EQC Magazin-PDF Report Deck mit dataSlot')?.id).toBe(
      'creation_print_report_v1',
    )
    expect(qualityJobForCreationCraftPlaybook('creation_print_magazine_v1')).toBe('print')
  })

  it('P92 print report brief + playbook mention Steps/Callout/columnAlign', () => {
    expect(
      resolveCreationCraftPlaybook(
        'EQC Magazin-PDF Report mit accent ChipRow, PrintCallout, PrintTable columnAlign right für EUR und PrintSteps emphasisIndex',
      )?.id,
    ).toBe('creation_print_report_v1')
    const report = buildCreationCraftPlaybookPromptBlock('creation_print_report_v1')
    expect(report).toContain('PrintSteps')
    expect(report).toContain('PrintCallout')
    expect(report).toContain('columnAlign')
    expect(report).toContain('SiteStack')
    const magazine = buildCreationCraftPlaybookPromptBlock('creation_print_magazine_v1')
    expect(magazine).toContain('PrintSteps')
    expect(magazine).toContain('PrintCallout')
  })

  it('resolves page as pattern first', () => {
    expect(resolveCreationCraftPlaybook('Seite als Pattern speichern')?.id).toBe(
      'creation_page_as_pattern_v1',
    )
  })

  it('injects format-specific playbook phases into depth prompt', () => {
    const newsletter = buildCreationSceneDepthPromptBlock(true, {
      playbookId: 'creation_newsletter_v1',
    })
    expect(newsletter).toContain('creation_newsletter_v1')
    expect(newsletter).toContain('560–640')
    expect(newsletter).toContain('PrintPage')

    const print = buildCreationCraftPlaybookPromptBlock('creation_print_magazine_v1')
    expect(print).toContain('PrintCover')
    expect(print).toContain('print')
  })

  it('attaches playbook on heuristic creation_scene_edit plans', () => {
    const plan = planAssistantTurnHeuristic({
      prompt: 'Baue einen Newsletter mit CTA',
      hasProjectContext: false,
      hasCheckionMcp: false,
      hasAudionMcp: false,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      hasCreationMcp: true,
      hasSpirionMcp: false,
      compactContextLoaded: false,
    })
    expect(plan.intent).toBe('creation_scene_edit')
    expect(plan.creationCraftPlaybookId).toBe('creation_newsletter_v1')
  })
})

describe('creation quality gate format jobs (Wave B)', () => {
  const denseCraft =
    '{"craftFlags":[],"sceneStats":{"nodeCount":20,"hasLargeDisplay":true,"hasHeroMedia":true,"maxFontSizePx":56}}'

  it('fails newsletter when Print* nodes are in the tree', () => {
    const verdict = evaluateCreationSceneQuality(
      [
        { name: 'creation_scene_import_html' },
        { name: 'creation_scene_content_audit', preview: '{"ok":true,"findings":[]}' },
        { name: 'creation_scene_craft_debug', preview: denseCraft },
        { name: 'creation_scene_preview', preview: '{"status":"ready"}' },
        {
          name: 'creation_scene_tree_index',
          preview: '- Page [p1] PrintPage\n  - Cover [c1] PrintCover\n  - CTA [b1] SiteButton',
        },
      ],
      { job: 'newsletter' },
    )
    expect(verdict.pass).toBe(false)
    expect(verdict.findings.join(' ')).toMatch(/Print\*/)
  })

  it('fails newsletter without CTA', () => {
    const verdict = evaluateCreationSceneQuality(
      [
        { name: 'creation_scene_apply_ops' },
        { name: 'creation_scene_content_audit', preview: '{"ok":true,"findings":[]}' },
        {
          name: 'creation_scene_craft_debug',
          preview:
            '{"craftFlags":[],"sceneStats":{"nodeCount":16,"hasLargeDisplay":true,"hasHeroMedia":false,"maxFontSizePx":32}}',
        },
        { name: 'creation_scene_preview', preview: '{"status":"ready"}' },
        {
          name: 'creation_scene_tree_index',
          preview: '- Root [r1] SiteStack\n  - Title [t1] SiteText',
        },
      ],
      { job: 'newsletter' },
    )
    expect(verdict.pass).toBe(false)
    expect(verdict.findings.join(' ')).toMatch(/CTA fehlt/)
  })

  it('fails print job without PrintPage after writes', () => {
    const verdict = evaluateCreationSceneQuality(
      [
        { name: 'creation_scene_apply_ops' },
        { name: 'creation_scene_content_audit', preview: '{"ok":true,"findings":[]}' },
        { name: 'creation_scene_craft_debug', preview: denseCraft },
        { name: 'creation_scene_preview', preview: '{"status":"ready"}' },
        {
          name: 'creation_scene_tree_index',
          preview: '- Hero [h1] SiteStack\n  - CTA [b1] SiteButton',
        },
      ],
      { job: 'print' },
    )
    expect(verdict.pass).toBe(false)
    expect(verdict.findings.join(' ')).toMatch(/PrintPage/)
  })

  it('passes print job with PrintPage and clean QA', () => {
    const verdict = evaluateCreationSceneQuality(
      [
        { name: 'creation_scene_apply_ops' },
        { name: 'creation_scene_content_audit', preview: '{"ok":true,"findings":[]}' },
        { name: 'creation_scene_craft_debug', preview: denseCraft },
        { name: 'creation_scene_preview', preview: '{"status":"ready"}' },
        {
          name: 'creation_scene_tree_index',
          preview: '- Sheet [p1] PrintPage\n  - Cover [c1] PrintCover',
        },
      ],
      { job: 'print' },
    )
    expect(verdict.pass).toBe(true)
    expect(verdict.job).toBe('print')
  })
})
