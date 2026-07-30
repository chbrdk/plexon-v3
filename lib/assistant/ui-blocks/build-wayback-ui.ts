import { randomUUID } from 'crypto';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import type { WaybackCheckPreview } from '@/lib/integrations/checkion-tools-wayback-client';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';

function formatWaybackTimestamp(ts: string | null): string {
  if (!ts || ts.length < 8) return '—';
  const y = ts.slice(0, 4);
  const m = ts.slice(4, 6);
  const d = ts.slice(6, 8);
  return `${d}.${m}.${y}`;
}

export function buildWaybackCheckLayout(data: WaybackCheckPreview): UiLayout {
  const blocks: UiLayout['blocks'] = [];

  const metrics = createUiBlock(
    'metric_grid',
    {
      title: 'Internet Archive',
      items: [
        { label: 'Archiviert', value: data.available ? 'Ja' : 'Nein' },
        {
          label: 'Erster Snapshot',
          value: formatWaybackTimestamp(data.firstSnapshotTimestamp),
        },
      ],
    },
    randomUUID()
  );
  if (metrics.ok) blocks.push(metrics.block);

  const kvItems: Array<{ label: string; value: string }> = [
    { label: 'URL', value: data.url },
    { label: 'Archiviert', value: data.available ? 'Ja' : 'Nein' },
    { label: 'Snapshot-Datum', value: formatWaybackTimestamp(data.firstSnapshotTimestamp) },
  ];
  if (data.firstSnapshotUrl) {
    kvItems.push({ label: 'Snapshot-Link', value: data.firstSnapshotUrl });
  }

  const kv = createUiBlock('key_value_list', { title: 'Wayback Machine', items: kvItems }, randomUUID());
  if (kv.ok) blocks.push(kv.block);

  if (data.available && data.firstSnapshotUrl) {
    const links = createUiBlock(
      'link_list',
      {
        title: 'Links',
        links: [{ label: 'Snapshot in Archive.org öffnen', href: data.firstSnapshotUrl, external: true }],
      },
      randomUUID()
    );
    if (links.ok) blocks.push(links.block);
  } else {
    const alert = createUiBlock(
      'alert',
      {
        tone: 'neutral',
        title: 'Kein Snapshot',
        message: 'Für diese URL wurde kein Archiv-Eintrag in der Wayback Machine gefunden.',
      },
      randomUUID()
    );
    if (alert.ok) blocks.push(alert.block);
  }

  return { version: UI_LAYOUT_VERSION, blocks };
}
