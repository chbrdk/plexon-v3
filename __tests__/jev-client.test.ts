import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createJevDecisions,
  parseDecisionsResponse,
  JevClientError,
} from '@/lib/jev/client'
import { isJevActEnabled, isJevShadowEnabled, useCaseEnvSuffix } from '@/lib/jev/env'
import { runShadowDecision } from '@/lib/jev/shadow'
import {
  JEV_USE_CASES,
  questionsAssistantIntent,
  questionsCreationModelTier,
} from '@/lib/jev/catalog'

describe('jev env', () => {
  beforeEach(() => {
    delete process.env.OPENROUTER_API_KEY
    delete process.env.JEV_SHADOW_ENABLED
    delete process.env.JEV_SHADOW_ASSISTANT_INTENT
    delete process.env.JEV_ACT_ASSISTANT_INTENT
  })

  it('maps use case ids to env suffixes', () => {
    expect(useCaseEnvSuffix('assistant.intent')).toBe('ASSISTANT_INTENT')
  })

  it('requires key + global shadow', () => {
    expect(isJevShadowEnabled(JEV_USE_CASES.assistantIntent)).toBe(false)
    process.env.OPENROUTER_API_KEY = 'sk-test'
    process.env.JEV_SHADOW_ENABLED = '1'
    expect(isJevShadowEnabled(JEV_USE_CASES.assistantIntent)).toBe(true)
    process.env.JEV_SHADOW_ASSISTANT_INTENT = '0'
    expect(isJevShadowEnabled(JEV_USE_CASES.assistantIntent)).toBe(false)
  })

  it('act defaults off', () => {
    process.env.OPENROUTER_API_KEY = 'sk-test'
    expect(isJevActEnabled(JEV_USE_CASES.assistantIntent)).toBe(false)
    process.env.JEV_ACT_ASSISTANT_INTENT = '1'
    expect(isJevActEnabled(JEV_USE_CASES.assistantIntent)).toBe(true)
  })
})

describe('parseDecisionsResponse', () => {
  it('parses choices nouls scores', () => {
    const r = parseDecisionsResponse(
      {
        model: 'typesafe/jev-1.13',
        choices: { intent: { key: 'free_chat', confidence: 0.9 } },
        nouls: { refine: { probability: 0.2 } },
        scores: { severity: { score: 2.5 } },
        usage: { cost: 0.0001 },
      },
      120,
    )
    expect(r.choices.intent.key).toBe('free_chat')
    expect(r.nouls.refine.probability).toBe(0.2)
    expect(r.scores.severity.score).toBe(2.5)
    expect(r.usage?.cost).toBe(0.0001)
    expect(r.latencyMs).toBe(120)
  })

  it('parses OpenRouter answers map', () => {
    const r = parseDecisionsResponse(
      {
        model: 'typesafe/jev-1.13-20260917',
        answers: {
          intent: {
            type: 'choice',
            choice: 'free_chat',
            confidence: 0.8,
            probabilities: { free_chat: 0.8, other: 0.2 },
          },
          refine: { type: 'noul', noul: 0.15 },
          severity: { type: 'score', score: 2.1, confidence: 0.9 },
        },
        usage: { cost: 0.00002, input_tokens: 100 },
      },
      90,
    )
    expect(r.choices.intent.key).toBe('free_chat')
    expect(r.nouls.refine.probability).toBe(0.15)
    expect(r.scores.severity.score).toBe(2.1)
    expect(r.usage?.promptTokens).toBe(100)
  })
})

describe('createJevDecisions', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'sk-test'
    process.env.OPENROUTER_API_BASE_URL = 'https://openrouter.test'
  })

  it('posts to decisions endpoint', async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          model: 'typesafe/jev-1.13',
          choices: { intent: { key: 'free_chat' } },
          usage: { cost: 0.001 },
        }),
        { status: 200 },
      )
    }) as unknown as typeof fetch

    const result = await createJevDecisions({
      state: { prompt: 'hi' },
      questions: questionsAssistantIntent(),
      fetchImpl,
    })
    expect(result.choices.intent.key).toBe('free_chat')
    expect(fetchImpl).toHaveBeenCalled()
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/alpha/decisions')
    expect(init.method).toBe('POST')
  })

  it('throws when unconfigured', async () => {
    delete process.env.OPENROUTER_API_KEY
    await expect(
      createJevDecisions({
        state: {},
        questions: questionsCreationModelTier(),
      }),
    ).rejects.toBeInstanceOf(JevClientError)
  })
})

describe('runShadowDecision', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'sk-test'
    process.env.JEV_SHADOW_ENABLED = '1'
    process.env.OPENROUTER_API_BASE_URL = 'https://openrouter.test'
  })

  it('compares baseline to jev and logs', async () => {
    const logs: unknown[] = []
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          model: 'typesafe/jev-1.13',
          choices: { intent: { key: 'free_chat' } },
        }),
        { status: 200 },
      )
    }) as unknown as typeof fetch

    const compare = await runShadowDecision({
      useCaseId: JEV_USE_CASES.assistantIntent,
      state: { prompt: 'hello' },
      questions: questionsAssistantIntent(),
      baseline: 'free_chat',
      extractJev: (r) => r.choices.intent?.key ?? null,
      awaitResult: true,
      fetchImpl,
      log: (c) => logs.push(c),
    })
    expect(compare?.agree).toBe(true)
    expect(logs).toHaveLength(1)
  })

  it('fail-open on upstream error', async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response('nope', { status: 500 })
    }) as unknown as typeof fetch

    const compare = await runShadowDecision({
      useCaseId: JEV_USE_CASES.assistantIntent,
      state: {},
      questions: questionsAssistantIntent(),
      baseline: 'x',
      extractJev: () => null,
      awaitResult: true,
      fetchImpl,
      log: () => {},
    })
    expect(compare?.agree).toBeNull()
    expect(compare?.error).toBeTruthy()
  })
})
