import { describe, expect, it } from 'vitest'

import { buildMarketIntelligenceFromEchon } from '@/lib/assistant/knowledge-pack/distill-echon-market'
import {
  mergeFacetData,
  normalizeMarketIntelligenceData,
  productMayPublishFacet,
} from '@/lib/collection-knowledge-pack'
import type { EchonMarketContext } from '@/lib/integrations/echon-market-context'

describe('market_intelligence Wave 2', () => {
  it('allows echon to publish market_intelligence', () => {
    expect(productMayPublishFacet('market_intelligence', 'echon')).toBe(true)
    expect(productMayPublishFacet('market_intelligence', 'audion')).toBe(false)
  })

  it('builds distillate from EchonMarketContext', () => {
    const market: EchonMarketContext = {
      available: true,
      threadId: 'thread-1',
      runId: 'run-1',
      executiveSummary: 'Wärmepumpen-Nachfrage steigt.',
      keyFindings: ['Förderung komplex', 'Installateur-Engpass'],
      implications: 'Trust gap',
    }
    const data = buildMarketIntelligenceFromEchon(market)
    expect(data?.summary).toContain('Wärmepumpen')
    expect(data?.waveHighlights).toHaveLength(2)
    expect(data?.sourceThreadId).toBe('thread-1')
  })

  it('merges market intelligence by replacing summary and unioning highlights', () => {
    const existing = normalizeMarketIntelligenceData({
      summary: 'Alt',
      topics: ['A'],
      waveHighlights: ['H1'],
      sourceThreadId: 't0',
    })
    const merged = mergeFacetData('market_intelligence', existing, {
      summary: 'Neu',
      topics: ['B'],
      waveHighlights: ['H2'],
      sourceThreadId: 't1',
    }) as ReturnType<typeof normalizeMarketIntelligenceData>
    expect(merged.summary).toBe('Neu')
    expect(merged.topics.sort()).toEqual(['A', 'B'])
    expect(merged.waveHighlights.sort()).toEqual(['H1', 'H2'])
    expect(merged.sourceThreadId).toBe('t1')
  })
})
