import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { planAssistantTurnHeuristic } from '@/lib/assistant/assistant-planner'
import { buildPlanSystemPromptBlock } from '@/lib/assistant/assistant-planner'
import {
  WAVE1_SPECIALIST_IDS,
  WAVE2_SPECIALIST_IDS,
  WAVE3_SPECIALIST_IDS,
  WAVE4_SPECIALIST_IDS,
  REGISTERED_SPECIALIST_IDS,
  resolveSpecialist,
  resolveSpecialistToolRoundBudget,
  creationSceneSpecialistFamilies,
} from '@/lib/assistant/specialists'
import {
  SCAN_FAMILIES,
  METRON_ANALYTICS_FAMILIES,
  VIDEON_MEDIA_FAMILIES,
  BRANDION_BRAND_FAMILIES,
  ECHON_MARKET_FAMILIES,
  ECHON_TO_AUDIENCE_FAMILIES,
  GEO_FAMILIES,
  PERSONA_FAMILIES,
  UX_JOURNEY_FAMILIES,
  SPIRION_RESEARCH_FAMILIES,
  CREATION_DESIGN_FAMILIES,
  AUDION_CHAT_FAMILIES,
  AUDION_DOCUMENTS_FAMILIES,
  AUDION_JOURNEY_FAMILIES,
  AUDION_KNOWLEDGE_FAMILIES,
  CHECKION_JOURNEY_FAMILIES,
} from '@/lib/assistant/tool-catalog'

const root = path.join(__dirname, '..')

const specialistCtx = {
  useCheckionMcp: true,
  useAudionMcp: false,
  useEchonMcp: true,
  useBrandionMcp: true,
  useCreationMcp: true,
  useSpirionMcp: false,
  useVideonMcp: true,
  useMetronMcp: true,
}

describe('assistant domain specialists (Wave 1)', () => {
  it('resolves Wave-1 intents and rejects general_chat', () => {
    expect(WAVE1_SPECIALIST_IDS).toEqual([
      'metron_analytics',
      'checkion_scan',
      'creation_scene_edit',
    ])
    expect(resolveSpecialist('general_chat')).toBeNull()

    const metron = resolveSpecialist('metron_analytics')
    expect(metron?.label).toBe('Metron')
    expect(metron?.toolFamilies).toEqual(expect.arrayContaining(METRON_ANALYTICS_FAMILIES))
    expect(metron?.buildSystemAddendum(specialistCtx)).toContain('Specialist: Metron')
    expect(metron?.buildSystemAddendum(specialistCtx)).toContain('METRON')

    const scan = resolveSpecialist('checkion_scan')
    expect(scan?.label).toBe('Checkion Scan')
    expect(scan?.toolFamilies).toEqual(expect.arrayContaining(SCAN_FAMILIES))
    expect(scan?.buildSystemAddendum(specialistCtx)).toContain('Specialist: Checkion Scan')
    expect(scan?.buildSystemAddendum(specialistCtx)).toContain('CHECKION')

    const creation = resolveSpecialist('creation_scene_edit')
    expect(creation?.label).toBe('Creation Scene')
    expect(creation?.buildSystemAddendum(specialistCtx)).toContain('CREATION')
    expect(creationSceneSpecialistFamilies(true).length).toBeGreaterThan(
      creationSceneSpecialistFamilies(false).length,
    )
  })

  it('planner maps KPI / scan prompts to specialist intents', () => {
    const metronPlan = planAssistantTurnHeuristic({
      prompt: 'Evaluiere den METRON KPI und zeige den Dashboard-Wert',
      hasProjectContext: true,
      hasCheckionMcp: true,
      hasAudionMcp: false,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      hasCreationMcp: false,
      hasSpirionMcp: false,
      hasVideonMcp: false,
      hasMetronMcp: true,
      compactContextLoaded: true,
    })
    expect(metronPlan.intent).toBe('metron_analytics')
    expect(resolveSpecialist(metronPlan.intent)?.id).toBe('metron_analytics')

    const scanPlan = planAssistantTurnHeuristic({
      prompt: 'Zeige die letzten Accessibility-Scans und Issues',
      hasProjectContext: true,
      hasCheckionMcp: true,
      hasAudionMcp: false,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      hasCreationMcp: false,
      hasMetronMcp: false,
      compactContextLoaded: true,
    })
    expect(scanPlan.intent).toBe('checkion_scan')
    expect(resolveSpecialist(scanPlan.intent)?.id).toBe('checkion_scan')
  })

  it('plan system block includes specialist line and keeps creation craft fields', () => {
    const plan = planAssistantTurnHeuristic({
      prompt: 'Füge auf der Landing einen CTA-Button ein',
      hasProjectContext: true,
      hasCheckionMcp: false,
      hasAudionMcp: false,
      hasEchonMcp: false,
      hasBrandionMcp: true,
      hasCreationMcp: true,
      hasSpirionMcp: false,
      hasVideonMcp: false,
      hasMetronMcp: false,
      compactContextLoaded: true,
      pageContext: {
        product: 'creation',
        pathname: '/editor',
        capability: 'editor',
        platformProjectId: 'pp-1',
        entityType: 'composition_scene',
        entityId: 'scene-1',
      },
    })
    expect(plan.intent).toBe('creation_scene_edit')
    const specialist = resolveSpecialist(plan.intent)
    const block = buildPlanSystemPromptBlock(plan, specialist)
    expect(block).toContain('Specialist: Creation Scene')
    expect(block).toContain('creation_scene_edit')
  })
})

describe('assistant domain specialists (Wave 2)', () => {
  it('registers videon / brandion / echon specialists', async () => {
    expect(WAVE2_SPECIALIST_IDS).toEqual(['videon_media', 'brandion_brand', 'echon_market'])
    expect(REGISTERED_SPECIALIST_IDS).toEqual(
      expect.arrayContaining([...WAVE1_SPECIALIST_IDS, ...WAVE2_SPECIALIST_IDS]),
    )

    const videon = resolveSpecialist('videon_media')
    expect(videon?.label).toBe('Videon')
    expect(videon?.toolFamilies).toEqual(expect.arrayContaining(VIDEON_MEDIA_FAMILIES))
    expect(await Promise.resolve(videon!.buildSystemAddendum(specialistCtx))).toContain(
      'Specialist: Videon',
    )

    const brandion = resolveSpecialist('brandion_brand')
    expect(brandion?.label).toBe('Brandion')
    expect(brandion?.toolFamilies).toEqual(expect.arrayContaining(BRANDION_BRAND_FAMILIES))
    expect(await Promise.resolve(brandion!.buildSystemAddendum(specialistCtx))).toContain(
      'Specialist: Brandion',
    )

    const echon = resolveSpecialist('echon_market')
    expect(echon?.label).toBe('Echon')
    expect(echon?.toolFamilies).toEqual(expect.arrayContaining(ECHON_MARKET_FAMILIES))
    expect(await Promise.resolve(echon!.buildSystemAddendum(specialistCtx))).toContain(
      'Specialist: Echon',
    )
  })

  it('planner maps media / brand / market prompts to Wave-2 specialists', () => {
    const videonPlan = planAssistantTurnHeuristic({
      prompt: 'Suche Clips in VIDEON und zeige Media-Hits',
      hasProjectContext: true,
      hasCheckionMcp: false,
      hasAudionMcp: false,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      hasCreationMcp: false,
      hasSpirionMcp: false,
      hasVideonMcp: true,
      hasMetronMcp: false,
      compactContextLoaded: true,
    })
    expect(videonPlan.intent).toBe('videon_media')
    expect(resolveSpecialist(videonPlan.intent)?.id).toBe('videon_media')

    const brandPlan = planAssistantTurnHeuristic({
      prompt: 'Zeige Brandion Guidelines und Design Tokens',
      hasProjectContext: true,
      hasCheckionMcp: false,
      hasAudionMcp: false,
      hasEchonMcp: false,
      hasBrandionMcp: true,
      hasCreationMcp: false,
      hasSpirionMcp: false,
      hasVideonMcp: false,
      hasMetronMcp: false,
      compactContextLoaded: true,
    })
    expect(brandPlan.intent).toBe('brandion_brand')
    expect(resolveSpecialist(brandPlan.intent)?.id).toBe('brandion_brand')

    const echonPlan = planAssistantTurnHeuristic({
      prompt: 'Welche ECHON Signals und Waves sind aktuell?',
      hasProjectContext: true,
      hasCheckionMcp: false,
      hasAudionMcp: false,
      hasEchonMcp: true,
      hasBrandionMcp: false,
      hasCreationMcp: false,
      hasSpirionMcp: false,
      hasVideonMcp: false,
      hasMetronMcp: false,
      compactContextLoaded: true,
    })
    expect(echonPlan.intent).toBe('echon_market')
    expect(resolveSpecialist(echonPlan.intent)?.id).toBe('echon_market')
  })

  it('spec, knowledge, agent and UI are wired for Wave 2', () => {
    const spec = readFileSync(
      path.join(root, 'specs/domain/assistant-domain-specialists.md'),
      'utf8',
    )
    const orch = readFileSync(
      path.join(root, 'knowledge/plexon-assistant-orchestrator.md'),
      'utf8',
    )
    const index = readFileSync(path.join(root, 'knowledge/specs-index.md'), 'utf8')
    const agent = readFileSync(path.join(root, 'lib/assistant/assistant-agent.ts'), 'utf8')
    const free = readFileSync(path.join(root, 'lib/assistant/handlers/free-chat.ts'), 'utf8')
    const planner = readFileSync(
      path.join(root, 'components/assistant/PlannerStepCard.tsx'),
      'utf8',
    )

    expect(spec).toContain('videon_media')
    expect(spec).toContain('brandion_brand')
    expect(spec).toContain('echon_market')
    expect(spec).toContain('Promise<string>')
    expect(orch).toContain('videon_media')
    expect(orch).toContain('brandion_brand')
    expect(orch).toContain('echon_market')
    expect(index).toContain('specs/domain/assistant-domain-specialists.md')
    expect(agent).toContain('await Promise.resolve(specialist.buildSystemAddendum')
    expect(agent).toContain('Connectivity only after plan')
    expect(free).toContain('specialistLabel')
    expect(planner).toContain('specialistLabel')
    expect(planner).toContain('plannerSpecialist')
  })
})

describe('assistant domain specialists (Wave 3)', () => {
  it('registers GEO / Audion / Spirion / Creation Design / Echon Audience', async () => {
    expect(WAVE3_SPECIALIST_IDS).toEqual([
      'checkion_seo_geo',
      'audion_persona',
      'audion_ux_journey',
      'spirion_research',
      'creation_design',
      'echon_audience',
    ])
    expect(REGISTERED_SPECIALIST_IDS).toEqual(
      expect.arrayContaining([...WAVE3_SPECIALIST_IDS]),
    )

    const geo = resolveSpecialist('checkion_seo_geo')
    expect(geo?.label).toBe('Checkion GEO')
    expect(geo?.toolFamilies).toEqual(expect.arrayContaining(GEO_FAMILIES))
    expect(await Promise.resolve(geo!.buildSystemAddendum(specialistCtx))).toContain(
      'Specialist: Checkion GEO',
    )

    const persona = resolveSpecialist('audion_persona')
    expect(persona?.label).toBe('Audion Persona')
    expect(persona?.toolFamilies).toEqual(expect.arrayContaining(PERSONA_FAMILIES))
    expect(await Promise.resolve(persona!.buildSystemAddendum(specialistCtx))).toContain(
      'Specialist: Audion Persona',
    )

    const ux = resolveSpecialist('audion_ux_journey')
    expect(ux?.label).toBe('Audion UX Journey')
    expect(ux?.toolFamilies).toEqual(expect.arrayContaining(UX_JOURNEY_FAMILIES))

    const spirion = resolveSpecialist('spirion_research')
    expect(spirion?.label).toBe('Spirion')
    expect(spirion?.toolFamilies).toEqual(expect.arrayContaining(SPIRION_RESEARCH_FAMILIES))
    expect(await Promise.resolve(spirion!.buildSystemAddendum(specialistCtx))).toContain(
      'Specialist: Spirion',
    )

    const design = resolveSpecialist('creation_design')
    expect(design?.label).toBe('Creation Design')
    expect(design?.toolFamilies).toEqual(expect.arrayContaining(CREATION_DESIGN_FAMILIES))

    const audience = resolveSpecialist('echon_audience')
    expect(audience?.label).toBe('Echon Audience')
    expect(audience?.toolFamilies).toEqual(expect.arrayContaining(ECHON_TO_AUDIENCE_FAMILIES))
    expect(await Promise.resolve(audience!.buildSystemAddendum(specialistCtx))).toContain(
      'Specialist: Echon Audience',
    )
  })

  it('planner maps Wave-3 prompts to specialists', () => {
    const geoPlan = planAssistantTurnHeuristic({
      prompt: 'Wie ist unser GEO Score und SEO Ranking?',
      hasProjectContext: true,
      hasCheckionMcp: true,
      hasAudionMcp: false,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      hasCreationMcp: false,
      hasSpirionMcp: false,
      hasVideonMcp: false,
      hasMetronMcp: false,
      compactContextLoaded: true,
    })
    expect(geoPlan.intent).toBe('checkion_seo_geo')
    expect(resolveSpecialist(geoPlan.intent)?.id).toBe('checkion_seo_geo')

    const personaPlan = planAssistantTurnHeuristic({
      prompt: 'Zeige die Personas und Zielgruppen für dieses Projekt',
      hasProjectContext: true,
      hasCheckionMcp: false,
      hasAudionMcp: true,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      hasCreationMcp: false,
      hasSpirionMcp: false,
      hasVideonMcp: false,
      hasMetronMcp: false,
      compactContextLoaded: true,
    })
    expect(personaPlan.intent).toBe('audion_persona')
    expect(resolveSpecialist(personaPlan.intent)?.id).toBe('audion_persona')

    const uxPlan = planAssistantTurnHeuristic({
      prompt: 'Starte den UX-Journey-Agent und zeige Screenshots',
      hasProjectContext: true,
      hasCheckionMcp: false,
      hasAudionMcp: true,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      hasCreationMcp: false,
      hasSpirionMcp: false,
      hasVideonMcp: false,
      hasMetronMcp: false,
      compactContextLoaded: true,
    })
    expect(uxPlan.intent).toBe('audion_ux_journey')
    expect(resolveSpecialist(uxPlan.intent)?.id).toBe('audion_ux_journey')

    const spirionPlan = planAssistantTurnHeuristic({
      prompt: 'Suche Spirion Design-Referenzen und Screens für Moodboards',
      hasProjectContext: true,
      hasCheckionMcp: false,
      hasAudionMcp: false,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      hasCreationMcp: false,
      hasSpirionMcp: true,
      hasVideonMcp: false,
      hasMetronMcp: false,
      compactContextLoaded: true,
    })
    expect(spirionPlan.intent).toBe('spirion_research')
    expect(resolveSpecialist(spirionPlan.intent)?.id).toBe('spirion_research')

    const designPlan = planAssistantTurnHeuristic({
      prompt: 'Liste CREATION Library Tags und Compositions',
      hasProjectContext: true,
      hasCheckionMcp: false,
      hasAudionMcp: false,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      hasCreationMcp: true,
      hasSpirionMcp: false,
      hasVideonMcp: false,
      hasMetronMcp: false,
      compactContextLoaded: true,
    })
    expect(designPlan.intent).toBe('creation_design')
    expect(resolveSpecialist(designPlan.intent)?.id).toBe('creation_design')
  })

  it('spec and knowledge document Wave 3', () => {
    const spec = readFileSync(
      path.join(root, 'specs/domain/assistant-domain-specialists.md'),
      'utf8',
    )
    const orch = readFileSync(
      path.join(root, 'knowledge/plexon-assistant-orchestrator.md'),
      'utf8',
    )
    expect(spec).toContain('checkion_seo_geo')
    expect(spec).toContain('audion_persona')
    expect(spec).toContain('spirion_research')
    expect(spec).toContain('creation_design')
    expect(spec).toContain('echon_audience')
    expect(spec).toContain('Wave 3')
    expect(orch).toContain('checkion_seo_geo')
    expect(orch).toContain('audion_ux_journey')
    expect(orch).toContain('echon_audience')
  })
})

describe('assistant domain specialists (Wave 4)', () => {
  it('registers remaining Audion + Checkion Journey specialists', async () => {
    expect(WAVE4_SPECIALIST_IDS).toEqual([
      'audion_knowledge',
      'audion_journey',
      'audion_chat',
      'audion_documents',
      'checkion_journey',
    ])
    expect(REGISTERED_SPECIALIST_IDS).toHaveLength(17)
    expect(resolveSpecialist('general_chat')).toBeNull()
    expect(resolveSpecialist('project_knowledge')).toBeNull()
    expect(resolveSpecialist('action_write')).toBeNull()

    const knowledge = resolveSpecialist('audion_knowledge')
    expect(knowledge?.label).toBe('Audion Knowledge')
    expect(knowledge?.toolFamilies).toEqual(expect.arrayContaining(AUDION_KNOWLEDGE_FAMILIES))
    expect(await Promise.resolve(knowledge!.buildSystemAddendum(specialistCtx))).toContain(
      'Specialist: Audion Knowledge',
    )

    const journey = resolveSpecialist('audion_journey')
    expect(journey?.label).toBe('Audion Journey')
    expect(journey?.toolFamilies).toEqual(expect.arrayContaining(AUDION_JOURNEY_FAMILIES))

    const chat = resolveSpecialist('audion_chat')
    expect(chat?.label).toBe('Audion Chat')
    expect(chat?.toolFamilies).toEqual(expect.arrayContaining(AUDION_CHAT_FAMILIES))

    const docs = resolveSpecialist('audion_documents')
    expect(docs?.label).toBe('Audion Documents')
    expect(docs?.toolFamilies).toEqual(expect.arrayContaining(AUDION_DOCUMENTS_FAMILIES))

    const checkionJourney = resolveSpecialist('checkion_journey')
    expect(checkionJourney?.label).toBe('Checkion Journey')
    expect(checkionJourney?.toolFamilies).toEqual(
      expect.arrayContaining(CHECKION_JOURNEY_FAMILIES),
    )
    expect(await Promise.resolve(checkionJourney!.buildSystemAddendum(specialistCtx))).toContain(
      'Specialist: Checkion Journey',
    )
  })

  it('planner maps Wave-4 prompts to specialists', () => {
    const chatPlan = planAssistantTurnHeuristic({
      prompt: 'Frage die Persona im Audion Chat nach Feedback',
      hasProjectContext: true,
      hasCheckionMcp: false,
      hasAudionMcp: true,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      hasCreationMcp: false,
      hasSpirionMcp: false,
      hasVideonMcp: false,
      hasMetronMcp: false,
      compactContextLoaded: true,
    })
    expect(chatPlan.intent).toBe('audion_chat')
    expect(resolveSpecialist(chatPlan.intent)?.id).toBe('audion_chat')

    const journeyPlan = planAssistantTurnHeuristic({
      prompt: 'Liste die AUDION Journeys und Journey-Steps',
      hasProjectContext: true,
      hasCheckionMcp: false,
      hasAudionMcp: true,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      hasCreationMcp: false,
      hasSpirionMcp: false,
      hasVideonMcp: false,
      hasMetronMcp: false,
      compactContextLoaded: true,
    })
    expect(journeyPlan.intent).toBe('audion_journey')
    expect(resolveSpecialist(journeyPlan.intent)?.id).toBe('audion_journey')

    const docsPlan = planAssistantTurnHeuristic({
      prompt: 'Liste die hochgeladenen Documents und PDFs in AUDION',
      hasProjectContext: true,
      hasCheckionMcp: false,
      hasAudionMcp: true,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      hasCreationMcp: false,
      hasSpirionMcp: false,
      hasVideonMcp: false,
      hasMetronMcp: false,
      compactContextLoaded: true,
    })
    expect(docsPlan.intent).toBe('audion_documents')
    expect(resolveSpecialist(docsPlan.intent)?.id).toBe('audion_documents')

    const checkionJourneyPlan = planAssistantTurnHeuristic({
      prompt: 'Zeige Checkion Journey Status und Journey-Steps ohne Änderungen',
      hasProjectContext: true,
      hasCheckionMcp: true,
      hasAudionMcp: false,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      hasCreationMcp: false,
      hasSpirionMcp: false,
      hasVideonMcp: false,
      hasMetronMcp: false,
      compactContextLoaded: true,
    })
    expect(checkionJourneyPlan.intent).toBe('checkion_journey')
    expect(resolveSpecialist(checkionJourneyPlan.intent)?.id).toBe('checkion_journey')
  })

  it('spec documents Wave 4 mop-up', () => {
    const spec = readFileSync(
      path.join(root, 'specs/domain/assistant-domain-specialists.md'),
      'utf8',
    )
    const orch = readFileSync(
      path.join(root, 'knowledge/plexon-assistant-orchestrator.md'),
      'utf8',
    )
    expect(spec).toContain('Wave 4')
    expect(spec).toContain('audion_documents')
    expect(spec).toContain('checkion_journey')
    expect(spec).toContain('seventeen')
    expect(orch).toContain('Wave 1–5')
  })
})

describe('assistant domain specialists (Wave 5)', () => {
  it('applies specialist maxToolRounds as a floor', () => {
    const metron = resolveSpecialist('metron_analytics')
    expect(resolveSpecialistToolRoundBudget(3, metron)).toBe(
      Math.max(3, metron?.maxToolRounds ?? 0),
    )
    expect(resolveSpecialistToolRoundBudget(10, metron)).toBe(10)
    expect(resolveSpecialistToolRoundBudget(4, null)).toBe(4)
  })

  it('planner card and locales cover specialist intents', () => {
    const planner = readFileSync(
      path.join(root, 'components/assistant/PlannerStepCard.tsx'),
      'utf8',
    )
    const de = readFileSync(path.join(root, 'locales/de.json'), 'utf8')
    const en = readFileSync(path.join(root, 'locales/en.json'), 'utf8')
    const agent = readFileSync(path.join(root, 'lib/assistant/assistant-agent.ts'), 'utf8')
    const chat = readFileSync(
      path.join(root, 'components/assistant/AssistantChat.tsx'),
      'utf8',
    )
    expect(planner).toContain('plannerIntentMetron')
    expect(planner).toContain('plannerIntentVideon')
    expect(planner).toContain('summaryLead')
    expect(de).toContain('plannerIntentCreationScene')
    expect(en).toContain('plannerIntentCreationScene')
    expect(agent).toContain('resolveSpecialistToolRoundBudget')
    expect(chat).toContain('specialistLabel')
  })

  it('spec documents Wave 5 polish', () => {
    const spec = readFileSync(
      path.join(root, 'specs/domain/assistant-domain-specialists.md'),
      'utf8',
    )
    const orch = readFileSync(
      path.join(root, 'knowledge/plexon-assistant-orchestrator.md'),
      'utf8',
    )
    expect(spec).toContain('Wave 5')
    expect(spec).toContain('resolveSpecialistToolRoundBudget')
    expect(orch).toContain('resolveSpecialistToolRoundBudget')
  })
})
