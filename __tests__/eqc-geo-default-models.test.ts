import { describe, expect, it } from 'vitest'
import {
  EQC_GEO_CLAUDE_MODELS,
  EQC_GEO_DEFAULT_MODELS,
  eqcGeoDefaultModels,
} from '@/lib/integrations/eqc-geo-default-models'

describe('eqc-geo-default-models', () => {
  it('includes GPT-5.6, every catalog Claude id, and Gemini Flash', () => {
    expect(EQC_GEO_DEFAULT_MODELS).toEqual([
      'gpt-5.6-luna',
      'gpt-5.6-terra',
      'gpt-5.6-sol',
      'claude-fable-5',
      'claude-opus-5',
      'claude-sonnet-5',
      'claude-opus-4-8',
      'claude-sonnet-4-6',
      'claude-haiku-4-5',
      'gemini-3.6-flash',
    ])
    expect([...EQC_GEO_CLAUDE_MODELS]).toEqual([
      'claude-fable-5',
      'claude-opus-5',
      'claude-sonnet-5',
      'claude-opus-4-8',
      'claude-sonnet-4-6',
      'claude-haiku-4-5',
    ])
    expect(eqcGeoDefaultModels()).toEqual([...EQC_GEO_DEFAULT_MODELS])
  })
})
