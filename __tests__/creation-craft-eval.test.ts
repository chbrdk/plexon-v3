import { describe, expect, it, afterEach } from 'vitest'

import {
  CREATION_CRAFT_EVAL_BRIEFS,
  CREATION_CRAFT_EVAL_TRACES,
  runCreationCraftEvalFixture,
  scoreCreationCraftEvalBriefs,
  scoreCreationCraftEvalTrace,
} from '@/lib/assistant/creation-craft-eval'
import {
  getCreationCompletionModelForTier,
  getCreationThinkingBudgetForTier,
  resolveCreationModelTier,
  resolveCreationSceneBudget,
} from '@/lib/assistant/creation-model-tier'

describe('creation craft eval harness (Wave D)', () => {
  it('ships ≥20 briefs and ≥5 recorded traces', () => {
    expect(CREATION_CRAFT_EVAL_BRIEFS.length).toBeGreaterThanOrEqual(20)
    expect(CREATION_CRAFT_EVAL_TRACES.length).toBeGreaterThanOrEqual(5)
  })

  it('resolves playbooks for the brief catalog at high hit rate', () => {
    const score = scoreCreationCraftEvalBriefs()
    expect(score.misses).toEqual([])
    expect(score.hits / score.total).toBeGreaterThanOrEqual(0.95)
  })

  it('scores recorded traces deterministically', () => {
    const pass = scoreCreationCraftEvalTrace(
      CREATION_CRAFT_EVAL_TRACES.find((t) => t.id === 'trace-landing-pass')!,
    )
    expect(pass.gate_pass).toBe(true)
    expect(pass.finished).toBe(true)
    expect(pass.preview_ok).toBe(true)
    expect(pass.thin).toBe(false)

    const thin = scoreCreationCraftEvalTrace(
      CREATION_CRAFT_EVAL_TRACES.find((t) => t.id === 'trace-landing-thin')!,
    )
    expect(thin.gate_pass).toBe(false)
    expect(thin.thin).toBe(true)

    const seed = scoreCreationCraftEvalTrace(
      CREATION_CRAFT_EVAL_TRACES.find((t) => t.id === 'trace-landing-seed')!,
    )
    expect(seed.gate_pass).toBe(false)
    expect(seed.seed_chrome).toBe(true)
  })

  it('fixture report meets landing quality floors', () => {
    const report = runCreationCraftEvalFixture()
    expect(report.briefCount).toBeGreaterThanOrEqual(20)
    expect(report.cases.length).toBeGreaterThanOrEqual(5)
    expect(report.playbookResolveRate).toBeGreaterThanOrEqual(0.95)
    expect(report.landingGatePassRate).toBeGreaterThanOrEqual(0.8)
    expect(report.landingThinRate).toBeLessThanOrEqual(0.15)
    expect(report.medianRoundsUsed).toBeGreaterThan(0)
  })
})

describe('creation model tier routing (Wave D)', () => {
  const originalTier = process.env.ASSISTANT_CREATION_MODEL_TIER
  const originalHighModel = process.env.ASSISTANT_CREATION_HIGH_MODEL
  const originalHighThinking = process.env.ANTHROPIC_CREATION_SCENE_THINKING_BUDGET_HIGH
  const originalBaseThinking = process.env.ANTHROPIC_ASSISTANT_THINKING_BUDGET
  const originalCreationThinking = process.env.ANTHROPIC_CREATION_SCENE_THINKING_BUDGET

  afterEach(() => {
    if (originalTier === undefined) delete process.env.ASSISTANT_CREATION_MODEL_TIER
    else process.env.ASSISTANT_CREATION_MODEL_TIER = originalTier
    if (originalHighModel === undefined) delete process.env.ASSISTANT_CREATION_HIGH_MODEL
    else process.env.ASSISTANT_CREATION_HIGH_MODEL = originalHighModel
    if (originalHighThinking === undefined) {
      delete process.env.ANTHROPIC_CREATION_SCENE_THINKING_BUDGET_HIGH
    } else {
      process.env.ANTHROPIC_CREATION_SCENE_THINKING_BUDGET_HIGH = originalHighThinking
    }
    if (originalBaseThinking === undefined) delete process.env.ANTHROPIC_ASSISTANT_THINKING_BUDGET
    else process.env.ANTHROPIC_ASSISTANT_THINKING_BUDGET = originalBaseThinking
    if (originalCreationThinking === undefined) {
      delete process.env.ANTHROPIC_CREATION_SCENE_THINKING_BUDGET
    } else {
      process.env.ANTHROPIC_CREATION_SCENE_THINKING_BUDGET = originalCreationThinking
    }
  })

  it('routes Q&A low and landing playbook writes high', () => {
    delete process.env.ASSISTANT_CREATION_MODEL_TIER
    expect(
      resolveCreationModelTier({ intent: 'creation_design', allowWriteTools: false }),
    ).toBe('low')
    expect(
      resolveCreationModelTier({
        intent: 'creation_scene_edit',
        allowWriteTools: true,
        playbookId: null,
      }),
    ).toBe('mid')
    expect(
      resolveCreationModelTier({
        intent: 'creation_scene_edit',
        allowWriteTools: true,
        playbookId: 'creation_landing_v1',
      }),
    ).toBe('high')
    expect(
      resolveCreationModelTier({
        intent: 'creation_scene_edit',
        allowWriteTools: true,
        playbookId: 'creation_newsletter_v1',
      }),
    ).toBe('high')
  })

  it('respects ASSISTANT_CREATION_MODEL_TIER override', () => {
    process.env.ASSISTANT_CREATION_MODEL_TIER = 'low'
    expect(
      resolveCreationModelTier({
        intent: 'creation_scene_edit',
        allowWriteTools: true,
        playbookId: 'creation_landing_v1',
      }),
    ).toBe('low')
  })

  it('keeps high model on default unless HIGH model env is set', () => {
    delete process.env.ASSISTANT_CREATION_HIGH_MODEL
    delete process.env.ANTHROPIC_ASSISTANT_MODEL_HIGH
    const mid = getCreationCompletionModelForTier('mid')
    const high = getCreationCompletionModelForTier('high')
    expect(high).toBe(mid)

    process.env.ASSISTANT_CREATION_HIGH_MODEL = 'claude-test-high'
    expect(getCreationCompletionModelForTier('high')).toBe('claude-test-high')
    expect(getCreationCompletionModelForTier('mid')).toBe(mid)
  })

  it('raises thinking floor on high tier without changing Q&A low', () => {
    process.env.ANTHROPIC_ASSISTANT_THINKING_BUDGET = '4096'
    delete process.env.ANTHROPIC_CREATION_SCENE_THINKING_BUDGET
    delete process.env.ANTHROPIC_CREATION_SCENE_THINKING_BUDGET_HIGH
    expect(getCreationThinkingBudgetForTier('low')).toBe(4096)
    expect(getCreationThinkingBudgetForTier('mid')).toBeGreaterThanOrEqual(8192)
    expect(getCreationThinkingBudgetForTier('high')).toBeGreaterThanOrEqual(12288)

    const budget = resolveCreationSceneBudget({
      intent: 'creation_scene_edit',
      allowWriteTools: true,
      playbookId: 'creation_print_magazine_v1',
    })
    expect(budget.tier).toBe('high')
    expect(budget.thinkingBudgetTokens).toBeGreaterThanOrEqual(12288)
  })
})
