import { describe, expect, it } from 'vitest'
import {
  buildCreationCraftModulesPromptBlock,
  listCreationCraftModules,
  promptLooksLikeBlogList,
  promptLooksLikeContactStrip,
  promptLooksLikeFaqAccordion,
  promptLooksLikeFeatureBento,
  promptLooksLikeNavChrome,
  promptLooksLikePdp,
  promptLooksLikePricing,
  promptLooksLikeRestyle,
  promptLooksLikeSocialProof,
  promptLooksLikeSpirionRef,
  promptLooksLikeStatsMetrics,
  promptLooksLikeTestimonialQuote,
  resolveCreationCraftModules,
} from '@/lib/assistant/creation-craft-modules'
import { buildCreationSceneDepthPromptBlock } from '@/lib/assistant/creation-scene-depth'
import { planAssistantTurnHeuristic, buildPlanSystemPromptBlock } from '@/lib/assistant/assistant-planner'
import {
  ASSISTANT_CAPABILITY_CREATION_EDITOR,
  ASSISTANT_ENTITY_COMPOSITION_SCENE,
} from '@/lib/assistant/page-context'

describe('creation craft modules', () => {
  it('lists restyle, wireframe, spirion, nav, stats, faq, bento, quote, and blog modules', () => {
    const ids = listCreationCraftModules().map((m) => m.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'spirion_section_ref_v1',
        'restyle_densify_v1',
        'wireframe_layout_v1',
        'nav_chrome_v1',
        'stats_metrics_v1',
        'pdp_detail_v1',
        'social_proof_row_v1',
        'testimonial_quote_v1',
        'faq_accordion_v1',
        'feature_bento_v1',
        'blog_list_v1',
        'pricing_compare_v1',
        'contact_strip_v1',
      ]),
    )
  })

  it('detects restyle phrasing', () => {
    expect(promptLooksLikeRestyle('Restyle die bestehende Landing — dichter')).toBe(true)
    expect(promptLooksLikeRestyle('Polish the existing hero')).toBe(true)
    expect(promptLooksLikeRestyle('Baue eine neue Landing von null')).toBe(false)
  })

  it('always attaches spirion_section_ref_v1 on landing/newsletter', () => {
    expect(promptLooksLikeSpirionRef('wie Spirion best practice')).toBe(true)
    expect(
      resolveCreationCraftModules('Baue eine neue Landing von null', 'creation_landing_v1'),
    ).toEqual(['spirion_section_ref_v1'])
    expect(
      resolveCreationCraftModules('Schreib einen Newsletter Digest', 'creation_newsletter_v1'),
    ).toEqual(['spirion_section_ref_v1'])
  })

  it('resolves restyle module under landing playbook with spirion', () => {
    expect(
      resolveCreationCraftModules('Restyle die bestehende Landing — dichter', 'creation_landing_v1'),
    ).toEqual(['restyle_densify_v1', 'spirion_section_ref_v1'])
  })

  it('resolves wireframe module and can compose with restyle + spirion', () => {
    expect(
      resolveCreationCraftModules('Wireframe 1:1 nachziehen und dichter restylen', 'creation_landing_v1'),
    ).toEqual(['restyle_densify_v1', 'spirion_section_ref_v1', 'wireframe_layout_v1'])
  })

  it('resolves PDP and social-proof modules', () => {
    expect(promptLooksLikePdp('Neue Produktdetailseite / PDP im Editor')).toBe(true)
    expect(promptLooksLikeSocialProof('Happy Customers Logo-Row mit 4 Icons')).toBe(true)
    expect(
      resolveCreationCraftModules('Create a PDP product page layout', 'creation_landing_v1'),
    ).toEqual(['spirion_section_ref_v1', 'pdp_detail_v1'])
    expect(
      resolveCreationCraftModules(
        'Happy Customers social proof logo row mit 4 Icons',
        'creation_landing_v1',
      ),
    ).toEqual(['spirion_section_ref_v1', 'social_proof_row_v1'])
    expect(
      resolveCreationCraftModules(
        'PDP mit Happy Customers Trust-Bar',
        'creation_landing_v1',
      ),
    ).toEqual(['spirion_section_ref_v1', 'pdp_detail_v1', 'social_proof_row_v1'])
  })

  it('caps modules and skips when playbook mismatches', () => {
    expect(resolveCreationCraftModules('Restyle denser', 'creation_print_magazine_v1')).toEqual([])
    expect(
      resolveCreationCraftModules('Restyle this newsletter digest', 'creation_newsletter_v1'),
    ).toEqual(['restyle_densify_v1', 'spirion_section_ref_v1'])
  })

  it('builds restyle override prompt that forbids full re-import', () => {
    const block = buildCreationCraftModulesPromptBlock(['restyle_densify_v1'])
    expect(block).toContain('restyle_densify_v1')
    expect(block).toMatch(/Kein.*creation_scene_import_html|Prefer.*apply_ops/i)
  })

  it('builds spirion section-ref prompt body', () => {
    const block = buildCreationCraftModulesPromptBlock(['spirion_section_ref_v1'])
    expect(block).toContain('spirion_section_ref_v1')
    expect(block).toMatch(/spirion_captures_list|capture_prompt_pack/)
  })

  it('builds PDP and social-proof prompt bodies', () => {
    const pdp = buildCreationCraftModulesPromptBlock(['pdp_detail_v1'])
    expect(pdp).toContain('pdp_detail_v1')
    expect(pdp).toMatch(/Product hero|Buy\/CTA|SiteGrid/)
    const social = buildCreationCraftModulesPromptBlock(['social_proof_row_v1'])
    expect(social).toContain('social_proof_row_v1')
    expect(social).toMatch(/columns=4|4 Zellen/)
  })

  it('resolves pricing and contact-strip modules', () => {
    expect(promptLooksLikePricing('Pricing table mit 3 Plänen')).toBe(true)
    expect(promptLooksLikeContactStrip('Contact us Strip mit Email und Demo anfragen')).toBe(true)
    expect(
      resolveCreationCraftModules('Preise Vergleich Grid mit drei Tarifen', 'creation_landing_v1'),
    ).toEqual(['spirion_section_ref_v1', 'pricing_compare_v1'])
    expect(
      resolveCreationCraftModules('Kontaktleiste Contact us Input und Button', 'creation_landing_v1'),
    ).toEqual(['spirion_section_ref_v1', 'contact_strip_v1'])
    expect(
      resolveCreationCraftModules(
        'Landing Preise und Contact us Strip',
        'creation_landing_v1',
      ),
    ).toEqual(['spirion_section_ref_v1', 'pricing_compare_v1', 'contact_strip_v1'])
  })

  it('builds pricing and contact prompt bodies', () => {
    const pricing = buildCreationCraftModulesPromptBlock(['pricing_compare_v1'])
    expect(pricing).toContain('pricing_compare_v1')
    expect(pricing).toMatch(/SiteGrid|Tier|emphasized/)
    const contact = buildCreationCraftModulesPromptBlock(['contact_strip_v1'])
    expect(contact).toContain('contact_strip_v1')
    expect(contact).toMatch(/SiteInput|SiteButton|eine Zeile/)
  })

  it('resolves nav chrome and stats metrics modules', () => {
    expect(promptLooksLikeNavChrome('Landing mit schlanker Top-Nav Header')).toBe(true)
    expect(promptLooksLikeStatsMetrics('Kennzahlen Zahlenband mit vier Metrics')).toBe(true)
    expect(promptLooksLikeStatsMetrics('Landingpage Hero + Stats Grid bauen')).toBe(true)
    expect(
      resolveCreationCraftModules('Slim site header navigation bar', 'creation_landing_v1'),
    ).toEqual(['spirion_section_ref_v1', 'nav_chrome_v1'])
    expect(
      resolveCreationCraftModules('KPI metrics strip under the hero', 'creation_landing_v1'),
    ).toEqual(['spirion_section_ref_v1', 'stats_metrics_v1'])
    expect(
      resolveCreationCraftModules(
        'Landing Top-Nav und Stats Grid Kennzahlen',
        'creation_landing_v1',
      ),
    ).toEqual(['spirion_section_ref_v1', 'nav_chrome_v1', 'stats_metrics_v1'])
  })

  it('builds nav and stats prompt bodies', () => {
    const nav = buildCreationCraftModulesPromptBlock(['nav_chrome_v1'])
    expect(nav).toContain('nav_chrome_v1')
    expect(nav).toMatch(/schlank|Mega-IA|In-Page/i)
    const stats = buildCreationCraftModulesPromptBlock(['stats_metrics_v1'])
    expect(stats).toContain('stats_metrics_v1')
    expect(stats).toMatch(/SiteGrid|Kennzahlen|eine.*Text-Shape/i)
  })

  it('resolves FAQ and feature-bento modules', () => {
    expect(promptLooksLikeFaqAccordion('FAQ Accordion mit häufigen Fragen')).toBe(true)
    expect(promptLooksLikeFeatureBento('Vorteile Feature-Bento ungleich 2+1')).toBe(true)
    expect(
      resolveCreationCraftModules('Add an FAQ accordion with Q and A', 'creation_landing_v1'),
    ).toEqual(['spirion_section_ref_v1', 'faq_accordion_v1'])
    expect(
      resolveCreationCraftModules('Asymmetric feature bento grid section', 'creation_landing_v1'),
    ).toEqual(['spirion_section_ref_v1', 'feature_bento_v1'])
    expect(
      resolveCreationCraftModules(
        'Landing FAQ und Feature-Bento Vorteile',
        'creation_landing_v1',
      ),
    ).toEqual(['spirion_section_ref_v1', 'faq_accordion_v1', 'feature_bento_v1'])
  })

  it('builds FAQ and bento prompt bodies', () => {
    const faq = buildCreationCraftModulesPromptBlock(['faq_accordion_v1'])
    expect(faq).toContain('faq_accordion_v1')
    expect(faq).toMatch(/Stack|Frage|three-up/i)
    const bento = buildCreationCraftModulesPromptBlock(['feature_bento_v1'])
    expect(bento).toContain('feature_bento_v1')
    expect(bento).toMatch(/Bento|2\+1|three-up/i)
  })

  it('resolves testimonial quote and blog list modules', () => {
    expect(promptLooksLikeTestimonialQuote('Kundenstimme Zitat mit Name und Rolle')).toBe(true)
    expect(promptLooksLikeBlogList('Blog Artikelübersicht mit Teaser-Liste')).toBe(true)
    expect(promptLooksLikeSocialProof('customer testimonial quote')).toBe(false)
    expect(
      resolveCreationCraftModules('Add a customer testimonial quote', 'creation_landing_v1'),
    ).toEqual(['spirion_section_ref_v1', 'testimonial_quote_v1'])
    expect(
      resolveCreationCraftModules('News blog list with title meta teaser', 'creation_landing_v1'),
    ).toEqual(['spirion_section_ref_v1', 'blog_list_v1'])
    expect(
      resolveCreationCraftModules(
        'Landing Testimonial Quote und Blog Artikelübersicht',
        'creation_landing_v1',
      ),
    ).toEqual(['spirion_section_ref_v1', 'testimonial_quote_v1', 'blog_list_v1'])
  })

  it('builds quote and blog prompt bodies', () => {
    const quote = buildCreationCraftModulesPromptBlock(['testimonial_quote_v1'])
    expect(quote).toContain('testimonial_quote_v1')
    expect(quote).toMatch(/Zitat|Attribution|Logo-Row/i)
    const blog = buildCreationCraftModulesPromptBlock(['blog_list_v1'])
    expect(blog).toContain('blog_list_v1')
    expect(blog).toMatch(/Teaser|Titel|Meta/i)
  })

  it('injects modules into depth when userPrompt matches', () => {
    const depth = buildCreationSceneDepthPromptBlock(true, {
      playbookId: 'creation_landing_v1',
      userPrompt: 'Restyle die bestehende Landing — dichter, kein Wireframe',
    })
    expect(depth).toContain('restyle_densify_v1')
    expect(depth).toContain('spirion_section_ref_v1')
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
    expect(plan.creationCraftModuleIds).toEqual(['restyle_densify_v1', 'spirion_section_ref_v1'])
    const block = buildPlanSystemPromptBlock(plan)
    expect(block).toContain('Craft-Module: restyle_densify_v1, spirion_section_ref_v1')
    expect(block).toContain('restyle_densify_v1')
    expect(block).toContain('spirion_section_ref_v1')
  })
})
