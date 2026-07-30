import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { AssistantReportPdfDocument } from '@/lib/assistant/reports/pdf/AssistantReportPdfDocument';

export function isPdfBuffer(data: Buffer): boolean {
  return data.length >= 5 && data.subarray(0, 5).toString('utf8').startsWith('%PDF');
}

export async function renderAssistantReportPdfLocal(input: {
  title: string;
  uiLayout: UiLayout;
}): Promise<Buffer> {
  const buffer = await renderToBuffer(
    <AssistantReportPdfDocument title={input.title} uiLayout={input.uiLayout} />
  );
  const pdf = Buffer.from(buffer);
  if (!isPdfBuffer(pdf)) {
    throw new Error('Local PDF render did not produce a valid PDF');
  }
  return pdf;
}
