import { randomUUID } from 'crypto';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import type { ScanSummarizePreview } from '@/lib/integrations/checkion-scan-summarize-client';
import { buildCheckionScanLink } from '@/lib/assistant/ui-blocks/product-links';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';

export function buildScanSummarizeLayout(data: ScanSummarizePreview): UiLayout {
  const blocks: UiLayout['blocks'] = [];

  const summaryText = createUiBlock(
    'text',
    {
      markdown: data.overallGrade
        ? `## Zusammenfassung (Note: ${data.overallGrade})\n\n${data.summary}`
        : `## Zusammenfassung\n\n${data.summary}`,
    },
    randomUUID()
  );
  if (summaryText.ok) blocks.push(summaryText.block);

  if (data.themes.length > 0) {
    const table = createUiBlock(
      'data_table',
      {
        title: 'Themen',
        columns: ['Thema', 'Schwere', 'Beschreibung'],
        rows: data.themes.slice(0, 8).map((t) => [
          t.name,
          t.severity ?? '—',
          (t.description ?? '').slice(0, 120),
        ]),
      },
      randomUUID()
    );
    if (table.ok) blocks.push(table.block);
  }

  if (data.recommendations.length > 0) {
    const markdown = data.recommendations
      .slice(0, 6)
      .map((r) => `**P${r.priority}: ${r.title}**\n\n${r.description}`)
      .join('\n\n---\n\n');
    const recBlock = createUiBlock(
      'collapsible',
      {
        title: `Empfehlungen (${data.recommendations.length})`,
        markdown,
        defaultOpen: true,
      },
      randomUUID()
    );
    if (recBlock.ok) blocks.push(recBlock.block);
  }

  const kv = createUiBlock(
    'key_value_list',
    {
      items: [
        { label: 'Scan-ID', value: data.scanId },
        ...(data.modelUsed ? [{ label: 'Modell', value: data.modelUsed }] : []),
      ],
    },
    randomUUID()
  );
  if (kv.ok) blocks.push(kv.block);

  const links = createUiBlock('link_list', { links: [buildCheckionScanLink(data.scanId)] }, randomUUID());
  if (links.ok) blocks.push(links.block);

  return { version: UI_LAYOUT_VERSION, blocks };
}

/** Merge scan result layout with summarize block (quick_scan + summarize). */
export function appendScanSummarizeToLayout(
  base: UiLayout,
  data: ScanSummarizePreview
): UiLayout {
  const extra = buildScanSummarizeLayout(data);
  return {
    version: UI_LAYOUT_VERSION,
    blocks: [...base.blocks, ...extra.blocks.filter((b) => b.type !== 'link_list')],
    panel: base.panel,
  };
}
