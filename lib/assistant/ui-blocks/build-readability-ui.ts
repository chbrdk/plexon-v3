import { randomUUID } from 'crypto';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import type { ReadabilityCheckPreview } from '@/lib/integrations/checkion-tools-readability-client';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';

export function buildReadabilityCheckLayout(data: ReadabilityCheckPreview): UiLayout {
  const blocks: UiLayout['blocks'] = [];

  const metrics = createUiBlock(
    'metric_grid',
    {
      title: 'Lesbarkeit',
      items: [
        { label: 'Grade Level', value: data.score },
        { label: 'Stufe', value: data.grade },
        { label: 'Wörter', value: data.stats.words },
        { label: 'Sätze', value: data.stats.sentences },
      ],
    },
    randomUUID()
  );
  if (metrics.ok) blocks.push(metrics.block);

  const chart = createUiBlock(
    'chart',
    {
      title: 'Text-Statistik',
      chartType: 'bar',
      labels: ['Sätze', 'Wörter', 'Silben'],
      datasets: [
        {
          label: 'Anzahl',
          values: [data.stats.sentences, data.stats.words, data.stats.syllables],
        },
      ],
    },
    randomUUID()
  );
  if (chart.ok) blocks.push(chart.block);

  const kv = createUiBlock('key_value_list', { items: [{ label: 'URL', value: data.url }] }, randomUUID());
  if (kv.ok) blocks.push(kv.block);

  return { version: UI_LAYOUT_VERSION, blocks };
}
