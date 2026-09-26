import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyAssistantIntentAct,
  materializeAssistantIntent,
  parsePlannerJevBucket,
} from '@/lib/jev/act-apply'
import { resolveAssistantIntent } from '@/lib/assistant/intent-router'
import { planAssistantTurn } from '@/lib/assistant/assistant-planner'
import { JEV_USE_CASES } from '@/lib/jev/catalog'

describe('jev act-apply intent', () => {
  it('materializes free_chat and geo with url', () => {
    expect(materializeAssistantIntent('hi', 'free_chat')).toEqual({ type: 'free_chat' })
    expect(materializeAssistantIntent('GEO https://example.com', 'geo_analysis')).toMatchObject({
      type: 'geo_analysis',
      url: 'https://example.com',
    })
    expect(materializeAssistantIntent('no url', 'geo_analysis')).toBeNull()
  })

  it('applies only when key differs and materializes', () => {
    const baseline = { type: 'free_chat' as const }
    expect(applyAssistantIntentAct('x', baseline, 'free_chat').applied).toBe(false)
    expect(applyAssistantIntentAct('Was kannst du?', baseline, 'capabilities')).toEqual({
      intent: { type: 'capabilities' },
      applied: true,
    })
    expect(applyAssistantIntentAct('x', baseline, 'geo_analysis').applied).toBe(false)
  })

  it('parses planner buckets', () => {
    expect(parsePlannerJevBucket('creation_scene_edit')).toBe('creation_scene_edit')
    expect(parsePlannerJevBucket('nope')).toBeNull()
  })
})

describe('resolveAssistantIntent Act', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'sk-test'
    process.env.OPENROUTER_API_BASE_URL = 'https://openrouter.test'
    process.env.JEV_ACT_ASSISTANT_INTENT = '1'
    delete process.env.JEV_SHADOW_ENABLED
  })
  afterEach(() => {
    delete process.env.JEV_ACT_ASSISTANT_INTENT
    delete process.env.OPENROUTER_API_KEY
  })

  it('overrides heuristic when Jev returns capabilities', async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          model: 'typesafe/jev-1.13',
          answers: {
            intent: { type: 'choice', key: 'capabilities' },
          },
        }),
        { status: 200 },
      )
    }) as unknown as typeof fetch

    const intent = await resolveAssistantIntent('irgendwas unklar', { fetchImpl })
    expect(intent.type).toBe('capabilities')
    expect(fetchImpl).toHaveBeenCalled()
  })

  it('fail-open keeps heuristic on upstream error', async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response('nope', { status: 500 })
    }) as unknown as typeof fetch

    const intent = await resolveAssistantIntent('Was kannst du?', { fetchImpl })
    expect(intent.type).toBe('capabilities')
  })
})

describe('planAssistantTurn Act', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'sk-test'
    process.env.OPENROUTER_API_BASE_URL = 'https://openrouter.test'
    process.env.JEV_ACT_ASSISTANT_PLANNER = '1'
  })
  afterEach(() => {
    delete process.env.JEV_ACT_ASSISTANT_PLANNER
    delete process.env.OPENROUTER_API_KEY
  })

  it('applies allow_write noul from Jev', async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          model: 'typesafe/jev-1.13',
          answers: {
            intent: { type: 'choice', key: 'other' },
            allow_write: { type: 'noul', probability: 0.9 },
          },
        }),
        { status: 200 },
      )
    }) as unknown as typeof fetch

    const plan = await planAssistantTurn(undefined, {
      prompt: 'was ist das projekt',
      hasProjectContext: true,
      hasCheckionMcp: true,
      hasAudionMcp: true,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      hasCreationMcp: false,
      compactContextLoaded: true,
    }, { fetchImpl })

    expect(plan.allowWriteTools).toBe(true)
    expect(fetchImpl).toHaveBeenCalled()
  })

  it('rematerializes geo_analysis bucket', async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          model: 'typesafe/jev-1.13',
          answers: {
            intent: { type: 'choice', key: 'geo_analysis' },
            allow_write: { type: 'noul', probability: 0.1 },
          },
        }),
        { status: 200 },
      )
    }) as unknown as typeof fetch

    const plan = await planAssistantTurn(undefined, {
      prompt: 'hallo',
      hasProjectContext: false,
      hasCheckionMcp: true,
      hasAudionMcp: false,
      hasEchonMcp: false,
      hasBrandionMcp: false,
      hasCreationMcp: false,
      compactContextLoaded: false,
    }, { fetchImpl })

    expect(plan.intent).toBe('checkion_seo_geo')
  })
})

describe('use case ids', () => {
  it('keeps catalog ids stable', () => {
    expect(JEV_USE_CASES.assistantIntent).toBe('assistant.intent')
    expect(JEV_USE_CASES.assistantPlanner).toBe('assistant.planner')
  })
})
