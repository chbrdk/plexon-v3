import { describe, expect, it } from 'vitest'
import { GEO_COMPETITIVE_CITATION_TARGET } from '@/lib/integrations/geo-competitive-answer-limits'
import { mapGeoOverviewV3ToPreview } from '@/lib/integrations/map-geo-overview-v3-preview'

describe('mapGeoOverviewV3ToPreview citation placements', () => {
  it('keeps up to 20 citation ranks per query run', () => {
    expect(GEO_COMPETITIVE_CITATION_TARGET).toBe(20)
    const citations = Array.from({ length: 20 }, (_, i) => ({
      domain: `brand-${i + 1}.example`,
      position: i + 1,
    }))
    const preview = mapGeoOverviewV3ToPreview(
      {
        job: { id: 'geo-1', url: 'https://acme.example', status: 'completed' },
        queryRuns: [
          {
            query: 'best acme alternative',
            modelId: 'claude-sonnet-5',
            citations,
          },
        ],
      },
      'geo-1'
    )
    expect(preview.citationHighlightsByModel?.[0]?.citations).toHaveLength(20)
    expect(preview.citationHighlightsByModel?.[0]?.runs?.[0]?.citations).toHaveLength(20)
    expect(preview.citationHighlightsByModel?.[0]?.citations?.[19]?.position).toBe(20)
  })

  it('prefers presence.solo.citedShare over draft job.citedShare 0', () => {
    const preview = mapGeoOverviewV3ToPreview(
      {
        job: {
          id: 'geo-1',
          url: 'https://brand.test',
          status: 'completed',
          citedShare: 0,
        },
        presence: { solo: { citedShare: 67 } },
        shareOfVoice: [
          { domain: 'brand.test', shareOfVoice: 0.67, isTarget: true },
          { domain: 'rival.example', shareOfVoice: 0.33, isTarget: false },
        ],
      },
      'geo-1'
    )
    expect(preview.citedShare).toBe(67)
    expect(preview.competitors?.some((c) => c.name === 'brand.test')).toBe(true)
  })
})
