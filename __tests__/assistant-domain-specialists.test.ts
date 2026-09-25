import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { planAssistantTurnHeuristic } from '@/lib/assistant/assistant-planner'
import { buildPlanSystemPromptBlock } from '@/lib/assistant/assistant-planner'
import {
  WAVE1_SPECIALIST_IDS,
  resolveSpecialist,
  creationSceneSpecialistFamilies,
} from '@/lib/assistant/specialists'
import { SCAN_FAMILIES, METRON_ANALYTICS_FAMILIES } from '@/lib/assistant/tool-catalog'

const root = path.join(__dirname, '..')

const specialistCtx = {
  useCheckionMcp: true,
  useAudionMcp: false,
  useEchonMcp: false,
  useBrandionMcp: false,
  useCreationMcp: true,
  useSpirionMcp: false,
  useVideonMcp: false,
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
    expect(resolveSpecialist('brandion_brand')).toBeNull()

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

  it('spec and knowledge are wired', () => {
    const spec = readFileSync(
      path.join(root, 'specs/domain/assistant-domain-specialists.md'),
      'utf8',
    )
    const orch = readFileSync(
      path.join(root, 'knowledge/plexon-assistant-orchestrator.md'),
      'utf8',
    )
    const index = readFileSync(path.join(root, 'knowledge/specs-index.md'), 'utf8')
    expect(spec).toContain('metron_analytics')
    expect(spec).toContain('checkion_scan')
    expect(spec).toContain('creation_scene_edit')
    expect(spec).toContain('resolveSpecialist')
    expect(orch).toContain('assistant-domain-specialists.md')
    expect(orch).toContain('lib/assistant/specialists/')
    expect(index).toContain('specs/domain/assistant-domain-specialists.md')
  })

  it('agent and free-chat surface resolve specialist meta', () => {
    const agent = readFileSync(path.join(root, 'lib/assistant/assistant-agent.ts'), 'utf8')
    const free = readFileSync(path.join(root, 'lib/assistant/handlers/free-chat.ts'), 'utf8')
    expect(agent).toContain('resolveSpecialist')
    expect(agent).toContain('productConnectivityBlock')
    expect(agent).toContain('specialistId')
    expect(free).toContain('specialistId')
    expect(free).toContain('specialistLabel')
  })
})
