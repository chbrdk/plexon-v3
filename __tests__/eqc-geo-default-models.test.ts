import { describe, expect, it } from 'vitest'
import {
  EQC_GEO_ALLOWED_MODELS,
  EQC_GEO_DEFAULT_MODELS,
  eqcGeoDefaultModels,
  sanitizeEqcGeoModels,
} from '@/lib/integrations/eqc-geo-default-models'

describe('eqc-geo-default-models', () => {
  it('locks Plexon EQC to one GPT, one Claude, and one Gemini model', () => {
    expect(EQC_GEO_DEFAULT_MODELS).toEqual([
      'gpt-5.6-terra',
      'claude-sonnet-5',
      'gemini-3.6-flash',
    ])
    expect([...EQC_GEO_ALLOWED_MODELS]).toEqual([
      'gpt-5.6-terra',
      'claude-sonnet-5',
      'gemini-3.6-flash',
    ])
    expect(eqcGeoDefaultModels()).toEqual([...EQC_GEO_DEFAULT_MODELS])
  })

  it('filters requested models to the locked trio and falls back when none survive', () => {
    expect(
      sanitizeEqcGeoModels([
        'gpt-5.6-sol',
        'claude-sonnet-5',
        'claude-sonnet-5',
        'gemini-3.6-flash',
      ])
    ).toEqual(['claude-sonnet-5', 'gemini-3.6-flash'])

    expect(sanitizeEqcGeoModels(['gpt-5.6-sol', 'claude-opus-5'])).toEqual([
      'gpt-5.6-terra',
      'claude-sonnet-5',
      'gemini-3.6-flash',
    ])
  })
})
