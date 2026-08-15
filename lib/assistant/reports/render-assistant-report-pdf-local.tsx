import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types';
import { EVENT_QUICK_CHECK_REPORT_BLOCK_TYPE } from '@/lib/assistant/reports/event-quick-check-report-types';
import { AssistantReportPdfDocument } from '@/lib/assistant/reports/pdf/AssistantReportPdfDocument';
import { tryRenderEqcMagazineViaCreationTemplate } from '@/lib/integrations/creation-magazine-template-client';

export function isPdfBuffer(data: Buffer): boolean {
  return data.length >= 5 && data.subarray(0, 5).toString('utf8').startsWith('%PDF');
}

export async function renderAssistantReportPdfLocal(input: {
  title: string;
  uiLayout: UiLayout;
}): Promise<Buffer> {
  const reportBlock = input.uiLayout.blocks.find(
    (b) => b.type === EVENT_QUICK_CHECK_REPORT_BLOCK_TYPE,
  );
  if (reportBlock) {
    const report = reportBlock.props.report as EventQuickCheckReportModel;
    const creation = await tryRenderEqcMagazineViaCreationTemplate(report);
    if (creation.ok && isPdfBuffer(creation.pdf)) {
      return creation.pdf;
    }
  }

  const buffer = await renderToBuffer(
    <AssistantReportPdfDocument title={input.title} uiLayout={input.uiLayout} />,
  );
  const pdf = Buffer.from(buffer);
  if (!isPdfBuffer(pdf)) {
    throw new Error('Local PDF render did not produce a valid PDF');
  }
  return pdf;
}
