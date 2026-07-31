'use client';

import { EventQuickCheckGeoBarChart } from '@/components/event-quick-check/EventQuickCheckGeoBarChart';
import type {
  EventQuickCheckReportGeoCompetitor,
  EventQuickCheckReportGeoEeatDimension,
} from '@/lib/assistant/reports/event-quick-check-report-types';
import type { EventQuickCheckCitationHighlight } from '@/lib/assistant/reports/event-quick-check/build-event-quick-check-geo-charts';
import {
  buildCitationPositionChart,
  buildCompetitorScoreChart,
  buildEeatScoreChart,
} from '@/lib/assistant/reports/event-quick-check/build-event-quick-check-geo-charts';

type Props = {
  citations?: EventQuickCheckCitationHighlight[];
  competitors?: EventQuickCheckReportGeoCompetitor[];
  eeatDimensions?: EventQuickCheckReportGeoEeatDimension[];
  showEeatChart?: boolean;
};

export function EventQuickCheckGeoCharts({
  citations = [],
  competitors = [],
  eeatDimensions = [],
  showEeatChart = false,
}: Props) {
  const citationChart = buildCitationPositionChart(citations);
  const competitorChart = buildCompetitorScoreChart(competitors);
  const eeatChart = showEeatChart ? buildEeatScoreChart(eeatDimensions) : null;

  if (!citationChart && !competitorChart && !eeatChart) return null;

  return (
    <div className="plexon-eqc-stack-sm">
      {competitorChart ? <EventQuickCheckGeoBarChart model={competitorChart} /> : null}
      {citationChart ? <EventQuickCheckGeoBarChart model={citationChart} /> : null}
      {eeatChart ? <EventQuickCheckGeoBarChart model={eeatChart} /> : null}
    </div>
  );
}
