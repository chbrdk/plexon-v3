'use client'

import { Text } from '@msqdx/ui'
import { EventQuickCheckMovesGallery } from '@/components/event-quick-check/EventQuickCheckMovesGallery'
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types'
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy'

type Props = {
  report: EventQuickCheckReportModel
}

/**
 * Dedicated GEO recommendations magazine chapter (moves gallery).
 */
export function EventQuickCheckGeoRecommendationsMagazineSection({ report }: Props) {
  const recommendations = report.geo.recommendations
  if (!recommendations.length) return null

  return (
    <div className="plexon-eqc-geo-spread" data-section="eqc-geo-recs-spread">
      <section className="plexon-eqc-moves" aria-labelledby="eqc-geo-recs-heading">
        <header className="plexon-eqc-insights__head">
          <Text role="meta" as="p" className="plexon-eqc-geo-eyebrow">
            Next moves
          </Text>
          <Text role="title" as="h3" id="eqc-geo-recs-heading">
            {EQC_REPORT_COPY.sectionGeoRecommendations}
          </Text>
        </header>
        <EventQuickCheckMovesGallery
          label={EQC_REPORT_COPY.sectionGeoRecommendations}
          recommendations={recommendations.map((r, i) => ({
            title: r.title,
            description: r.description,
            priority: r.priority ?? i + 1,
            category: 'GEO',
          }))}
        />
      </section>
    </div>
  )
}
