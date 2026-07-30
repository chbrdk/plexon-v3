import { randomUUID } from 'crypto';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import type { DomainScanPreview } from '@/lib/integrations/checkion-domain-scan-client';
import { pathCheckionDomainScan } from '@/lib/paths/checkion-api';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';

function scoreTone(score: number): 'success' | 'warning' | 'error' {
  if (score >= 90) return 'success';
  if (score >= 70) return 'warning';
  return 'error';
}

export function buildDomainScanLayout(scan: DomainScanPreview): UiLayout {
  const blocks: UiLayout['blocks'] = [];

  const intro = createUiBlock(
    'text',
    {
      markdown: `## Domain Deep Scan\n\n**${scan.domain}** — ${scan.totalPages} Seiten analysiert`,
    },
    randomUUID()
  );
  if (intro.ok) blocks.push(intro.block);

  const metrics = createUiBlock(
    'metric_grid',
    {
      title: 'Übersicht',
      items: [
        { label: 'Score', value: scan.score, unit: '/100', tone: scoreTone(scan.score) },
        { label: 'Seiten', value: scan.totalPages },
        { label: 'Fehler', value: scan.stats.errors, tone: scan.stats.errors > 0 ? 'error' : 'success' },
        { label: 'Warnungen', value: scan.stats.warnings, tone: scan.stats.warnings > 0 ? 'warning' : 'neutral' },
      ],
    },
    randomUUID()
  );
  if (metrics.ok) blocks.push(metrics.block);

  if (scan.topIssues.length > 0) {
    const table = createUiBlock(
      'data_table',
      {
        title: 'Top Issues (domain-weit)',
        columns: ['Issue', 'Seiten'],
        rows: scan.topIssues.map((i) => [i.title, i.count]),
      },
      randomUUID()
    );
    if (table.ok) blocks.push(table.block);
  }

  const kv = createUiBlock(
    'key_value_list',
    {
      items: [
        { label: 'Domain', value: scan.domain },
        { label: 'Scan-ID', value: scan.id },
        { label: 'Status', value: scan.status },
        ...(scan.seoPagesAnalyzed != null
          ? [{ label: 'SEO-Seiten', value: String(scan.seoPagesAnalyzed) }]
          : []),
      ],
    },
    randomUUID()
  );
  if (kv.ok) blocks.push(kv.block);

  const links = createUiBlock(
    'link_list',
    {
      title: 'Links',
      links: [
        {
          label: 'Deep Scan in CHECKION öffnen',
          href: pathCheckionDomainScan({ url: scan.url || `https://${scan.domain}`, scanId: scan.id }),
          external: true,
        },
      ],
    },
    randomUUID()
  );
  if (links.ok) blocks.push(links.block);

  return { version: UI_LAYOUT_VERSION, blocks };
}
