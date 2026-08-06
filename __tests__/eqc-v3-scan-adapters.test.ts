import { describe, expect, it } from 'vitest'
import { mapDomainScanV3ToPreview } from '@/lib/integrations/map-domain-scan-v3-preview'
import { mapGeoOverviewV3ToPreview } from '@/lib/integrations/map-geo-overview-v3-preview'

describe('mapDomainScanV3ToPreview', () => {
  it('maps score, pages and top issues', () => {
    const preview = mapDomainScanV3ToPreview({
      scan: {
        id: 'd1',
        projectId: 'p1',
        url: 'https://www.example.com/path',
        status: 'completed',
        overallScore: 91,
        pageCount: 7,
      },
      issues: [
        { title: 'Alt missing', severity: 'serious', affectedCount: 4 },
        { title: 'Contrast', severity: 'moderate', affectedCount: 2 },
      ],
    })
    expect(preview.domain).toBe('example.com')
    expect(preview.score).toBe(91)
    expect(preview.totalPages).toBe(7)
    expect(preview.status).toBe('complete')
    expect(preview.topIssues[0]?.title).toBe('Alt missing')
    expect(preview.stats.errors).toBeGreaterThan(0)
  })
})

describe('mapGeoOverviewV3ToPreview', () => {
  it('maps eeat, share of voice and query runs', () => {
    const job = mapGeoOverviewV3ToPreview(
      {
        job: {
          id: 'g1',
          url: 'https://brand.test',
          status: 'completed',
          overallScore: 66,
          citedShare: 40,
        },
        eeat: {
          experience: 70,
          expertise: 80,
          authoritativeness: 60,
          trustworthiness: 75,
          geoFitness: 72,
        },
        queries: ['What is brand?'],
        shareOfVoice: [
          { domain: 'rival.com', shareOfVoice: 0.3, avgPosition: 2, mentionCount: 3 },
          { domain: 'brand.test', shareOfVoice: 0.4, isTarget: true },
        ],
        recommendations: [{ title: 'Improve FAQ', body: 'Add FAQ', severity: 'high' }],
        queryRuns: [
          {
            queryId: 'q1',
            query: 'What is brand?',
            modelId: 'gpt',
            answerText: 'Brand is…',
            citations: [{ domain: 'rival.com', position: 1 }],
          },
        ],
      },
      'g1'
    )
    expect(job.jobId).toBe('g1')
    expect(job.status).toBe('complete')
    expect(job.geoFitnessScore).toBe(72)
    expect(job.eeatScores?.expertise?.score).toBe(80)
    expect(job.competitors?.[0]?.name).toBe('rival.com')
    expect(job.recommendations?.[0]?.title).toBe('Improve FAQ')
    expect(job.citationHighlightsByModel?.[0]?.citations.length).toBeGreaterThan(0)
  })

  it('keeps separate model slices for LLM switcher', () => {
    const job = mapGeoOverviewV3ToPreview(
      {
        job: { id: 'g2', url: 'https://brand.test', status: 'completed', overallScore: 50 },
        queryRuns: [
          {
            query: 'Q1',
            modelId: 'gpt-5.4-nano',
            citations: [{ domain: 'brand.test', position: 1 }],
          },
          {
            query: 'Q1',
            modelId: 'gpt-5.5',
            citations: [{ domain: 'rival.com', position: 1 }],
          },
        ],
      },
      'g2'
    )
    expect(job.citationHighlightsByModel?.map((s) => s.modelId).sort()).toEqual([
      'gpt-5.4-nano',
      'gpt-5.5',
    ])
  })
})
