import { describe, expect, it } from 'vitest';
import { buildEventQuickCheckReportModel } from '@/lib/assistant/reports/build-event-quick-check-report-model';
import { buildEventQuickCheckReportBlock } from '@/lib/assistant/reports/build-event-quick-check-report-block';
import { eventQuickCheckBvikFixture } from '@/__tests__/fixtures/event-quick-check-report.fixture';
import type { UiBlock } from '@/lib/assistant/ui-blocks/types';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import { renderUiBlockPdf } from '@/lib/assistant/reports/pdf/render-ui-block-pdf';
import { renderAssistantReportPdfLocal } from '@/lib/assistant/reports/render-assistant-report-pdf-local';

function block(type: UiBlock['type'], props: Record<string, unknown>, id = type): UiBlock {
  return { id, type, props };
}

const sampleBlocks: UiBlock[] = [
  block('text', { markdown: 'Intro text' }),
  block('alert', { title: 'Hinweis', message: 'Wichtig', tone: 'warning' }),
  block('metric_grid', {
    title: 'KPIs',
    items: [{ label: 'Score', value: 92, unit: '%' }],
  }),
  block('data_table', {
    title: 'Top Issues',
    columns: ['Issue', 'Count'],
    rows: [['Broken links', 3]],
  }),
  block('key_value_list', {
    title: 'Scan',
    items: [{ label: 'URL', value: 'https://example.com' }],
  }),
  block('finding_list', {
    items: [{ title: 'Finding', description: 'Detail', severity: 'warning' }],
  }),
  block('recommendation_list', {
    items: [{ title: 'Fix links', description: 'Update hrefs', priority: 1 }],
  }),
  block('link_list', {
    title: 'Links',
    links: [{ label: 'Report', href: 'https://example.com/r' }],
  }),
  block('persona_card', {
    personas: [{ id: 'p1', name: 'Anna', segment: 'B2B', confidence: 0.9, headline: 'Decision maker' }],
  }),
  block('target_group_card', {
    targetGroups: [
      {
        id: 'tg1',
        name: 'Enterprise',
        segment: 'DE',
        description: 'Large accounts',
        personaCount: 2,
        knowledgeEntryCount: 5,
      },
    ],
  }),
  block('summary_card', {
    title: 'Overview',
    checkionScanCount: 4,
    audionPersonaCount: 2,
    links: [{ label: 'Open', href: 'https://example.com' }],
  }),
  block('step_list', {
    title: 'Workflow',
    steps: [{ id: 's1', label: 'Scan', status: 'done', detail: 'Completed' }],
  }),
  block('corner_tab_section', { tabLabel: 'SEO', title: 'Meta', markdown: 'Description missing' }),
  block('collapsible', { title: 'Details', markdown: 'Hidden content in print' }),
  block('chart', {
    title: 'Traffic',
    chartType: 'bar',
    labels: ['Mon', 'Tue'],
    datasets: [{ label: 'Visits', values: [100, 120] }],
  }),
];

describe('renderUiBlockPdf', () => {
  it('renders event_quick_check_report block', () => {
    const model = buildEventQuickCheckReportModel(eventQuickCheckBvikFixture());
    const blockResult = buildEventQuickCheckReportBlock(model);
    expect(blockResult.ok).toBe(true);
    if (!blockResult.ok) return;
    const node = renderUiBlockPdf(blockResult.block);
    expect(node).toBeTruthy();
  });

  it('renders every supported block type without throwing', () => {
    for (const b of sampleBlocks) {
      expect(() => renderUiBlockPdf(b)).not.toThrow();
      expect(renderUiBlockPdf(b)).toBeTruthy();
    }
  });
});

describe('renderAssistantReportPdfLocal with rich blocks', () => {
  it('produces PDF for layout with varied pinned block types', async () => {
    const pdf = await renderAssistantReportPdfLocal({
      title: 'Rich Report',
      uiLayout: { version: UI_LAYOUT_VERSION, blocks: sampleBlocks },
    });
    expect(pdf.subarray(0, 4).toString('utf8')).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(1000);
  }, 20000);
});
