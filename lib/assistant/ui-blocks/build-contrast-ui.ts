import { randomUUID } from 'crypto';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import type { ContrastCheckPreview } from '@/lib/integrations/checkion-tools-contrast-client';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';

export function buildContrastCheckLayout(data: ContrastCheckPreview): UiLayout {
  const blocks: UiLayout['blocks'] = [];

  const metrics = createUiBlock(
    'metric_grid',
    {
      title: 'WCAG Kontrast',
      items: [
        { label: 'Ratio', value: data.ratio, unit: ':1' },
        { label: 'AA', value: data.score.aa },
        { label: 'AAA', value: data.score.aaa },
        { label: 'AA Large', value: data.score.aaLarge },
      ],
    },
    randomUUID()
  );
  if (metrics.ok) blocks.push(metrics.block);

  const kv = createUiBlock(
    'key_value_list',
    {
      title: 'Farben',
      items: [
        { label: 'Vordergrund', value: `#${data.foreground}` },
        { label: 'Hintergrund', value: `#${data.background}` },
        { label: 'AAA Large', value: data.score.aaaLarge },
      ],
    },
    randomUUID()
  );
  if (kv.ok) blocks.push(kv.block);

  if (data.score.aa === 'fail') {
    const alert = createUiBlock(
      'alert',
      {
        tone: 'warning',
        title: 'WCAG AA nicht erfüllt',
        message: 'Der Kontrast ist für normalen Text unter 4.5:1.',
      },
      randomUUID()
    );
    if (alert.ok) blocks.push(alert.block);
  }

  return { version: UI_LAYOUT_VERSION, blocks };
}
