import { describe, expect, it } from 'vitest'
import {
  buildCreationCraftModulesPromptBlock,
  listCreationCraftModules,
  promptLooksLikePdp,
  promptLooksLikeRestyle,
  promptLooksLikeSocialProof,
  resolveCreationCraftModules,
} from '@/lib/assistant/creation-craft-modules'
import { buildCreationSceneDepthPromptBlock } from '@/lib/assistant/creation-scene-depth'
import { planAssistantTurnHeuristic, buildPlanSystemPromptBlock } from '@/lib/assistant/assistant-planner'
import {
  ASSISTANT_CAPABILITY_CREATION_EDITOR,
  ASSISTANT_ENTITY_COMPOSITION_SCENE,
} from '@/lib/assistant/page-context'

describe('creation craft modules', () => {
  it('lists restyle and wireframe modules', () => {
    const ids = listCreationCraftModules().map((m) => m.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'restyle_densify_v1',
        'wireframe_layout_v1',
        'pdp_detail_v1',
        'social_proof_row_v1',
      ]),
    )
  })

  it('detects restyle phrasing', () => {
    expect(promptLooksLikeRestyle('Restyle die bestehende Landing — dichter')).toBe(true)
    expect(promptLooksLikeRestyle('Polish the existing hero')).toBe(true)
    expect(promptLooksLikeRestyle('Baue eine neue Landing von null')).toBe(false)
  })

  it('resolves restyle module under landing playbook', () => {
    expect(
      resolveCreationCraftModules('Restyle die bestehende Landing — dichter', 'creation_landing_v1'),
    ).toEqual(['restyle_densify_v1'])
  })

  it('resolves wireframe module and can compose with restyle', () => {
    expect(
      resolveCreationCraftModules('Wireframe 1:1 nachziehen und dichter restylen', 'creation_landing_v1'),
    ).toEqual(['restyle_densify_v1', 'wireframe_layout_v1'])
  })

  it('resolves PDP and social-proof modules', () => {
    expect(promptLooksLikePdp('Neue Produktdetailseite / PDP im Editor')).toBe(true)
    expect(promptLooksLikeSocialProof('Happy Customers Logo-Row mit 4 Icons')).toBe(true)
    expect(
      resolveCreationCraftModules('Create a PDP product page layout', 'creation_landing_v1'),
    ).toEqual(['pdp_detail_v1'])
    expect(
      resolveCreationCraftModules(
        'Happy Customers social proof logo row mit 4 Icons',
        'creation_landing_v1',
      ),
    ).toEqual(['social_proof_row_v1'])
    expect(
      resolveCreationCraftModules(
        'PDP mit Happy Customers Trust-Bar',
        'creation_landing_v1',
      ),
    ).toEqual(['pdp_detail_v1', 'social_proof_row_v1'])
  })

  it('caps modules and skips when playbook mismatches', () => {
    expect(resolveCreationCraftModules('Restyle denser', 'creation_print_magazine_v1')).toEqual([])
    expect(
      resolveCreationCraftModules('Restyle this newsletter digest', 'creation_newsletter_v1'),
    ).toEqual(['restyle_densify_v1'])
  })

  it('builds restyle override prompt that forbids full re-import', () => {
    const block = buildCreationCraftModulesPromptBlock(['restyle_densify_v1'])
    expect(block).toContain('restyle_densify_v1')
    expect(block).toMatch(/Kein.*creation_scene_import_html|Prefer.*apply_ops/i)
  })

  it('builds PDP and social-proof prompt bodies', () => {
    const pdp = buildCreationCraftModulesPromptBlock(['pdp_detail_v1'])
    expect(pdp).toContain('pdp_detail_v1')
    expect(pdp).toMatch(/Product hero|Buy\/CTA|SiteGrid/)
    const social = buildCreationCraftModulesPromptBlock(['social_proof_row_v1'])
    expect(social).toContain('social_proof_row_v1')
    expect(social).toMatch(/columns=4|4 Zellen/)
  })

  it('injects modules into depth when userPrompt matches', () => {
    const depth = buildCreationSceneDepthPromptBlock(true, {
      playbookId: 'creation_landing_v1',
      userPrompt: 'Restyle die bestehende Landing — dichter, kein Wireframe',
    })
    expect(depth).toContain('restyle_densify_v1')
    expect(depth).toContain('Prefer')
  })

  it('planner attaches module ids for restyle scene edits', () => {
    const plan = planAssistantTurnHeuristic({
      prompt: 'Restyle die bestehende Landing — dichter',
      hasProjectContext: false,
      hasCheckionMcp: false,
      hasAudionMcp: false,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      hasCreationMcp: true,
      compactContextLoaded: false,
      pageContext: {
        product: 'creation',
        pathname: '/editor',
        capability: ASSISTANT_CAPABILITY_CREATION_EDITOR,
        entityType: ASSISTANT_ENTITY_COMPOSITION_SCENE,
        entityId: 'scene-1',
      },
    })
    expect(plan.creationCraftPlaybookId).toBe('creation_landing_v1')
    expect(plan.creationCraftModuleIds).toEqual(['restyle_densify_v1'])
    const block = buildPlanSystemPromptBlock(plan)
    expect(block).toContain('Craft-Module: restyle_densify_v1')
    expect(block).toContain('restyle_densify_v1')
  })
})
