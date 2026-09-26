import { describe, expect, it, beforeEach } from 'vitest'
import { resolveScoreTone } from '@/lib/jev/score-tone'

describe('resolveScoreTone', () => {
  beforeEach(() => {
    delete process.env.OPENROUTER_API_KEY
    delete process.env.JEV_SHADOW_ENABLED
  })

  it('maps thresholds', () => {
    expect(resolveScoreTone(90)).toBe('pos')
    expect(resolveScoreTone(50)).toBe('low')
    expect(resolveScoreTone(10)).toBe('neg')
  })
})
