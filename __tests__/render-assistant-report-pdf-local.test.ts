import { describe, expect, it } from 'vitest';
import { buildReportLayout } from '@/lib/assistant/reports/build-report-layout';
import type { ReportNarrative } from '@/lib/assistant/reports/types';
import { renderAssistantReportPdfLocal } from '@/lib/assistant/reports/render-assistant-report-pdf-local';

const narrative: ReportNarrative = {
  title: 'Test Report',
  intro: 'Intro',
  executiveSummary: 'Summary',
  fazit: 'Done',
  fazitTone: 'success',
  findings: [{ title: 'Finding', description: 'Detail', severity: 'info' }],
  recommendations: [{ title: 'Action', description: 'Do it', priority: 2 }],
};

describe('renderAssistantReportPdfLocal', () => {
  it('produces a valid PDF buffer', async () => {
    const layout = buildReportLayout(narrative, []);
    const pdf = await renderAssistantReportPdfLocal({ title: narrative.title, uiLayout: layout });
    expect(pdf.subarray(0, 4).toString('utf8')).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(500);
  }, 15000);
});
