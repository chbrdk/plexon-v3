import { describe, expect, it } from 'vitest'
import {
  EQC_GEO_LIVE_MODELS,
  EQC_GEO_RECALL_MODELS,
  eqcGeoDefaultModels,
  eqcGeoDefaultModelsForMeasurement,
  sanitizeEqcGeoModels,
} from '@/lib/integrations/eqc-geo-default-models'

describe('eqc-geo-default-models', () => {
  it('uses the curated trio for live Layer 2', () => {
    expect([...EQC_GEO_LIVE_MODELS]).toEqual([
      'gpt-5.6-terra',
      'claude-sonnet-5',
      'gemini-3.6-flash',
    ])
    expect(eqcGeoDefaultModels()).toEqual([...EQC_GEO_LIVE_MODELS])
    expect(eqcGeoDefaultModelsForMeasurement('live')).toEqual([...EQC_GEO_LIVE_MODELS])
  })

  it('expands Layer 1 recall to GPT subs + Claude tiers + Gemini', () => {
    expect([...EQC_GEO_RECALL_MODELS]).toEqual([
      'gpt-5.6-luna',
      'gpt-5.6-terra',
      'gpt-5.6-sol',
      'claude-opus-5',
      'claude-sonnet-5',
      'claude-haiku-4-5',
      'gemini-3.6-flash',
    ])
    expect(eqcGeoDefaultModelsForMeasurement('recall')).toEqual([...EQC_GEO_RECALL_MODELS])
    expect(eqcGeoDefaultModelsForMeasurement(undefined)).toEqual([...EQC_GEO_RECALL_MODELS])
  })

  it('sanitizes live jobs to the trio and drops Layer-1-only ids', () => {
    expect(
      sanitizeEqcGeoModels(
        ['gpt-5.6-sol', 'claude-sonnet-5', 'claude-sonnet-5', 'gemini-3.6-flash'],
        'live'
      )
    ).toEqual(['claude-sonnet-5', 'gemini-3.6-flash'])

    expect(sanitizeEqcGeoModels(['gpt-5.6-sol', 'claude-opus-5'], 'live')).toEqual([
      'gpt-5.6-terra',
      'claude-sonnet-5',
      'gemini-3.6-flash',
    ])
  })

  it('keeps Layer-1 models on recall jobs', () => {
    expect(
      sanitizeEqcGeoModels(
        ['gpt-5.6-luna', 'gpt-5.6-sol', 'claude-opus-5', 'claude-haiku-4-5'],
        'recall'
      )
    ).toEqual(['gpt-5.6-luna', 'gpt-5.6-sol', 'claude-opus-5', 'claude-haiku-4-5'])
  })
})
