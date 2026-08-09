import { describe, expect, it } from 'vitest'
import {
  withRewrittenGeoRecommendations,
  type EqcGeoRecommendation,
} from '@/lib/assistant/event-quick-check/rewrite-eqc-geo-recommendations'
import type { GeoEeatJobPreview } from '@/lib/integrations/checkion-geo-client'

describe('rewrite-eqc-geo-recommendations helpers', () => {
  it('applies rewritten recommendations onto preview', () => {
    const preview = {
      id: 'job-1',
      status: 'completed',
      url: 'https://beispiel.de',
      recommendations: [{ title: 'Old', description: 'Old body', priority: 1 }],
    } as GeoEeatJobPreview
    const next: EqcGeoRecommendation[] = [
      { title: 'Neu konkret', description: 'Mach X auf Beispiel.de', priority: 1 },
    ]
    const out = withRewrittenGeoRecommendations(preview, next)
    expect(out.recommendations?.[0]?.title).toBe('Neu konkret')
    expect(preview.recommendations?.[0]?.title).toBe('Old')
  })
})
