import React from 'react';
import { Document, Page, Text } from '@react-pdf/renderer';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types';
import { EventQuickCheckReportPdfDocument } from '@/lib/assistant/reports/pdf/event-quick-check-report-pdf';
import { renderUiBlockPdf } from '@/lib/assistant/reports/pdf/render-ui-block-pdf';
import { reportPdfStyles as s } from '@/lib/assistant/reports/pdf/report-pdf-styles';

export function AssistantReportPdfDocument({
  title,
  uiLayout,
}: {
  title: string;
  uiLayout: UiLayout;
}) {
  const reportBlock = uiLayout.blocks.find((b) => b.type === 'event_quick_check_report');
  if (reportBlock) {
    const report = reportBlock.props.report as EventQuickCheckReportModel;
    return <EventQuickCheckReportPdfDocument report={report} />;
  }

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.coverTitle}>{title}</Text>
        <Text style={s.coverSubtitle}>PLEXON Assistent — kuratierter Session-Report</Text>
        {uiLayout.blocks.map((block) => renderUiBlockPdf(block))}
      </Page>
    </Document>
  );
}

