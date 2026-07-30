import { describe, expect, it } from 'vitest';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import {
  isPptxBuffer,
  renderAssistantReportPptxLocal,
} from '@/lib/assistant/reports/render-assistant-report-pptx-local';

const sampleBlocks = [
  { id: 'text-1', type: 'text' as const, props: { markdown: '# Report\n\nIntro text.' } },
  {
    id: 'metric-1',
    type: 'metric_grid' as const,
    props: { title: 'KPIs', items: [{ label: 'Score', value: 92, unit: '%' }] },
  },
  {
    id: 'chart-1',
    type: 'chart' as const,
    props: {
      title: 'Traffic',
      chartType: 'bar',
      labels: ['Mon', 'Tue'],
      datasets: [{ label: 'Visits', values: [100, 120] }],
    },
  },
];

describe('renderAssistantReportPptxLocal', () => {
  it('produces valid pptx zip buffer', async () => {
    const pptx = await renderAssistantReportPptxLocal({
      title: 'Local Report',
      uiLayout: { version: UI_LAYOUT_VERSION, blocks: sampleBlocks },
    });
    expect(isPptxBuffer(pptx)).toBe(true);
    expect(pptx.length).toBeGreaterThan(1000);
  }, 20000);
});
