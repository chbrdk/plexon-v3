import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { attachRecommendationsToMetadata } from '@/lib/assistant/insights/conversation-recommendations'
import {
  buildFlowHandoffSystemHint,
  buildSpecialistFlowHandoffRecommendations,
  isFlowHandoffSpecialistIntent,
  promptSuggestsLongJob,
} from '@/lib/assistant/insights/specialist-flow-handoff'
import { routeAssistantIntent } from '@/lib/assistant/intent-router'

const root = path.join(__dirname, '..')

describe('specialist → collection flow handoff', () => {
  it('classifies long-job prompts and handoff specialists', () => {
    expect(promptSuggestsLongJob('Deep scan example.com mit 500 Seiten')).toBe(true)
    expect(promptSuggestsLongJob('Zeige den KPI')).toBe(false)
    expect(isFlowHandoffSpecialistIntent('checkion_scan')).toBe(true)
    expect(isFlowHandoffSpecialistIntent('creation_scene_edit')).toBe(false)
  })

  it('builds flow follow-ups when Collection is bound', () => {
    expect(
      buildSpecialistFlowHandoffRecommendations({
        plannerIntent: 'checkion_scan',
        platformProjectId: null,
      }),
    ).toEqual([])

    const recs = buildSpecialistFlowHandoffRecommendations({
      plannerIntent: 'checkion_scan',
      specialistId: 'checkion_scan',
      platformProjectId: 'pp-1',
    })
    expect(recs.map((r) => r.id)).toEqual([
      'flow-handoff-run',
      'flow-handoff-list',
      'flow-handoff-promote',
    ])

    const soft = buildSpecialistFlowHandoffRecommendations({
      specialistId: 'brandion_brand',
      platformProjectId: 'pp-1',
    })
    expect(soft.map((r) => r.id)).toEqual(['flow-handoff-list', 'flow-handoff-promote'])
  })

  it('builds system hint only for long-job prompts', () => {
    expect(
      buildFlowHandoffSystemHint({
        specialistLabel: 'Checkion Scan',
        prompt: 'Kurzer WCAG-Check',
      }),
    ).toBeNull()
    const hint = buildFlowHandoffSystemHint({
      specialistLabel: 'Checkion Scan',
      prompt: 'Deep scan der Domain mit 1000 Seiten',
    })
    expect(hint).toContain('Flow-Handoff')
    expect(hint).toContain('Collection Flow')
  })

  it('attaches handoff chips via recommendation pipeline', () => {
    const meta = attachRecommendationsToMetadata(
      {
        planner: { intent: 'videon_media', specialistId: 'videon_media' },
      },
      {
        intent: { type: 'free_chat' },
        prompt: 'Suche Clips',
        history: [],
        platformProjectId: 'pp-9',
      },
    )
    const ids = ((meta?.followUpPrompts as Array<{ id: string }>) ?? []).map((r) => r.id)
    expect(ids).toContain('flow-handoff-run')
    expect(ids).toContain('flow-handoff-list')
  })

  it('resolves preferred flow from specialist hints', async () => {
    const { resolvePreferredFlowForSpecialist, findLastSpecialistFromHistory } = await import(
      '@/lib/assistant/insights/specialist-flow-handoff'
    )
    expect(
      resolvePreferredFlowForSpecialist('checkion_scan', [
        { id: 'a', name: 'Page Quality Scan', templateId: 'page-quality' },
        { id: 'b', name: 'GEO Trust', templateId: 'geo' },
      ])?.id,
    ).toBe('a')
    expect(
      resolvePreferredFlowForSpecialist('checkion_scan', [
        { id: 'a', name: 'Alpha', templateId: null },
        { id: 'b', name: 'Beta', templateId: null },
      ]),
    ).toBeNull()
    expect(
      findLastSpecialistFromHistory([
        { role: 'user', content: 'hi' },
        {
          role: 'assistant',
          content: '…',
          metadata: { planner: { intent: 'checkion_scan', specialistId: 'checkion_scan' } },
        },
      ]),
    ).toBe('checkion_scan')
  })

  it('intent router recognizes expanded flow start phrasing', () => {
    expect(routeAssistantIntent('Starte den Collection Flow').type).toBe('run_collection_flow')
    expect(routeAssistantIntent('Im Flow ausführen').type).toBe('run_collection_flow')
  })

  it('agent and docs wire handoff', () => {
    const agent = readFileSync(path.join(root, 'lib/assistant/assistant-agent.ts'), 'utf8')
    const spec = readFileSync(
      path.join(root, 'specs/domain/assistant-domain-specialists.md'),
      'utf8',
    )
    const orch = readFileSync(
      path.join(root, 'knowledge/plexon-assistant-orchestrator.md'),
      'utf8',
    )
    expect(agent).toContain('buildFlowHandoffSystemHint')
    expect(spec).toContain('Flow handoff')
    expect(orch).toContain('specialist-flow-handoff.ts')
  })
})
