import { randomUUID } from 'crypto';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import type { SslCheckPreview } from '@/lib/integrations/checkion-tools-ssl-client';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';

export function buildSslCheckLayout(data: SslCheckPreview): UiLayout {
  const blocks: UiLayout['blocks'] = [];

  const grade = data.grade ?? '—';
  const metrics = createUiBlock(
    'metric_grid',
    {
      title: 'SSL / TLS',
      items: [
        { label: 'Grade', value: grade },
        { label: 'Status', value: data.status },
      ],
    },
    randomUUID()
  );
  if (metrics.ok) blocks.push(metrics.block);

  const kvItems: Array<{ label: string; value: string }> = [
    { label: 'Host', value: data.host },
    { label: 'SSL Labs Status', value: data.status },
    { label: 'Grade', value: grade },
  ];
  if (data.endpoints?.length) {
    data.endpoints.forEach((ep, i) => {
      kvItems.push({
        label: `Endpoint ${i + 1}`,
        value: [ep.serverName, ep.grade].filter(Boolean).join(' · ') || '—',
      });
    });
  }

  const kv = createUiBlock('key_value_list', { title: 'Details', items: kvItems }, randomUUID());
  if (kv.ok) blocks.push(kv.block);

  if (data.status === 'IN_PROGRESS') {
    const alert = createUiBlock(
      'alert',
      {
        tone: 'warning',
        title: 'Analyse läuft noch',
        message: 'SSL Labs kann 1–2 Minuten brauchen. Bitte erneut prüfen.',
      },
      randomUUID()
    );
    if (alert.ok) blocks.push(alert.block);
  }

  return { version: UI_LAYOUT_VERSION, blocks };
}
