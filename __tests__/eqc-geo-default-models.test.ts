import { describe, expect, it } from 'vitest'
import {
  EQC_GEO_DEFAULT_MODELS,
  eqcGeoDefaultModels,
} from '@/lib/integrations/eqc-geo-default-models'

describe('eqc-geo-default-models', () => {
  it('defaults to the compact multi-provider set', () => {
    expect(EQC_GEO_DEFAULT_MODELS).toEqual([
      'gpt-5.6-luna',
      'gpt-5.6-terra',
      'gpt-5.6-sol',
      'claude-sonnet-5',
      'gemini-3.6-flash',
    ])
    expect(eqcGeoDefaultModels()).toEqual([...EQC_GEO_DEFAULT_MODELS])
  })
})
