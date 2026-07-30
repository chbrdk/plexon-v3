import { randomUUID } from 'crypto';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import type { GeoEeatJobPreview } from '@/lib/integrations/checkion-geo-client';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';

export function buildGeoEeatLayout(job: GeoEeatJobPreview): UiLayout {
  const blocks: UiLayout['blocks'] = [];

  if (job.overallScore != null) {
    const metrics = createUiBlock(
      'metric_grid',
      {
        title: 'GEO / E-E-A-T',
        items: [{ label: 'Gesamt-Score', value: job.overallScore, unit: '/100' }],
      },
      randomUUID()
    );
    if (metrics.ok) blocks.push(metrics.block);
  }

  const competitors = job.competitors ?? [];
  if (competitors.length > 0) {
    const table = createUiBlock(
      'data_table',
      {
        title: 'Wettbewerber',
        columns: ['Name', 'Score'],
        rows: competitors.slice(0, 10).map((c) => [c.name, c.score ?? '—']),
      },
      randomUUID()
    );
    if (table.ok) blocks.push(table.block);

    const chart = createUiBlock(
      'chart',
      {
        title: 'Score-Vergleich',
        chartType: 'bar',
        labels: competitors.slice(0, 8).map((c) => c.name.slice(0, 24)),
        datasets: [
          {
            label: 'Score',
            values: competitors.slice(0, 8).map((c) => c.score ?? 0),
          },
        ],
      },
      randomUUID()
    );
    if (chart.ok) blocks.push(chart.block);
  }

  const keywords = job.keywords ?? [];
  if (keywords.length > 0) {
    const kwTable = createUiBlock(
      'data_table',
      {
        title: 'Keywords',
        columns: ['Keyword'],
        rows: keywords.slice(0, 15).map((k) => [k]),
      },
      randomUUID()
    );
    if (kwTable.ok) blocks.push(kwTable.block);
  }

  const kv = createUiBlock(
    'key_value_list',
    {
      items: [
        { label: 'URL', value: job.url },
        { label: 'Job-ID', value: job.jobId },
        { label: 'Status', value: job.status },
      ],
    },
    randomUUID()
  );
  if (kv.ok) blocks.push(kv.block);

  return { version: UI_LAYOUT_VERSION, blocks };
}
