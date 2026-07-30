import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { buildEventQuickCheckReportPages, EventQuickCheckReportPdfDocument } from '@/lib/assistant/reports/pdf/event-quick-check-report-pdf';
import { buildEventQuickCheckReportModel } from '@/lib/assistant/reports/build-event-quick-check-report-model';
import { buildEventQuickCheckReportBlock } from '@/lib/assistant/reports/build-event-quick-check-report-block';
import {
  eventQuickCheckBvikFixture,
  eventQuickCheckBvikNarrativeFixture,
} from '@/__tests__/fixtures/event-quick-check-report.fixture';
import { renderAssistantReportPdfLocal } from '@/lib/assistant/reports/render-assistant-report-pdf-local';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';

describe('buildEventQuickCheckReportPages', () => {
  it('builds branded MSQDX pages for all report chapters', () => {
    const report = buildEventQuickCheckReportModel(
      eventQuickCheckBvikFixture(),
      eventQuickCheckBvikNarrativeFixture()
    );
    const pages = buildEventQuickCheckReportPages(report);
    expect(pages.length).toBeGreaterThanOrEqual(7);
    expect(pages[0]?.key).toBe('cover');
  });
});

describe('EventQuickCheckReportPdfDocument', () => {
  it('renders a valid PDF buffer with MSQDX branding', async () => {
    const report = buildEventQuickCheckReportModel(eventQuickCheckBvikFixture());
    const buffer = await renderToBuffer(<EventQuickCheckReportPdfDocument report={report} />);
    const pdf = Buffer.from(buffer);
    expect(pdf.subarray(0, 4).toString('utf8')).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(3000);
  }, 20000);

  it('local assistant PDF uses branded quick check document', async () => {
    const report = buildEventQuickCheckReportModel(eventQuickCheckBvikFixture());
    const blockResult = buildEventQuickCheckReportBlock(report);
    expect(blockResult.ok).toBe(true);
    if (!blockResult.ok) return;

    const pdf = await renderAssistantReportPdfLocal({
      title: report.meta.title,
      uiLayout: { version: UI_LAYOUT_VERSION, blocks: [blockResult.block] },
    });
    expect(pdf.subarray(0, 4).toString('utf8')).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(3000);
  }, 20000);
});
