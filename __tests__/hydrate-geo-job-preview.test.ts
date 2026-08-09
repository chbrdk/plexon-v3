import { describe, expect, it } from 'vitest'
import {
  geoJobFromCatalogBundle,
  geoPreviewForCatalogBundle,
  mergeGeoPreviewIntoJob,
} from '@/lib/assistant/event-quick-check/hydrate-geo-job-preview'
import type { GeoEeatJobPreview } from '@/lib/integrations/checkion-geo-client'

const richPreview: GeoEeatJobPreview = {
  jobId: 'geo-1',
  url: 'https://example.com',
  status: 'completed',
  overallScore: 62,
  geoFitnessScore: 55,
  citationHighlightsByModel: [
    {
      modelId: 'gpt-5.5',
      modelLabel: 'GPT-5.5',
      citations: [{ query: 'best crm', domain: 'example.com', position: 1 }],
      runs: [
        {
          query: 'best crm',
          answerText: 'Example.com is often cited for CRM.',
          citations: [{ domain: 'example.com', position: 1 }],
        },
      ],
    },
  ],
}

describe('hydrate-geo-job-preview helpers', () => {
  it('geoJobFromCatalogBundle restores preview runs for magazine answers', () => {
    const bundle = {
      status: 'completed',
      citedShare: 0.4,
      geoFitness: 55,
      overallScore: 62,
      url: 'https://example.com',
      preview: geoPreviewForCatalogBundle(richPreview),
    }
    const job = geoJobFromCatalogBundle(bundle, 'geo-1')
    expect(job?.jobId).toBe('geo-1')
    expect(job?.citationHighlightsByModel?.[0]?.runs?.[0]?.answerText).toMatch(/Example/)
  })

  it('mergeGeoPreviewIntoJob keeps thin scores when preview omits them', () => {
    const merged = mergeGeoPreviewIntoJob(
      {
        jobId: 'geo-1',
        url: 'https://example.com',
        status: 'completed',
        overallScore: 70,
        geoFitnessScore: 60,
      },
      {
        ...richPreview,
        overallScore: null,
        geoFitnessScore: null,
      }
    )
    expect(merged.overallScore).toBe(70)
    expect(merged.geoFitnessScore).toBe(60)
    expect(merged.citationHighlightsByModel?.length).toBe(1)
  })
})
