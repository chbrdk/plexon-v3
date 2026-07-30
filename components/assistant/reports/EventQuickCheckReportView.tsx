'use client';

import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types';
import { EventQuickCheckReportStack } from '@/components/assistant/reports/event-quick-check/EventQuickCheckReportSections';

type Props = {
  report: EventQuickCheckReportModel;
};

export function EventQuickCheckReportView({ report }: Props) {
  return <EventQuickCheckReportStack report={report} />;
}
