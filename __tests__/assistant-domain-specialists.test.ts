import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { planAssistantTurnHeuristic } from '@/lib/assistant/assistant-planner'
import { buildPlanSystemPromptBlock } from '@/lib/assistant/assistant-planner'
import {
  WAVE1_SPECIALIST_IDS,
  WAVE2_SPECIALIST_IDS,
  REGISTERED_SPECIALIST_IDS,
  resolveSpecialist,
  creationSceneSpecialistFamilies,
} from '@/lib/assistant/specialists'
import {
  SCAN_FAMILIES,
  METRON_ANALYTICS_FAMILIES,
  VIDEON_MEDIA_FAMILIES,
  BRANDION_BRAND_FAMILIES,
  ECHON_MARKET_FAMILIES,
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
    expect(REGISTERED_SPECIALIST_IDS).toHaveLength(6)

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
