import { randomUUID } from 'crypto';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';
import type { PersonaPageRelevancePreview } from '@/lib/integrations/persona-page-relevance-client';

function tierLabel(tier: 'high' | 'medium' | 'low'): string {
  if (tier === 'high') return 'hoch';
  if (tier === 'medium') return 'mittel';
  return 'niedrig';
}

export function buildPersonaPageRelevanceLayout(preview: PersonaPageRelevancePreview): UiLayout {
  const blocks: UiLayout['blocks'] = [];
  const { persona, domainScan, rankedPages, corpusMetrics, corpusTruncated, corpusMode, collectionName } =
    preview;

  const intro = createUiBlock(
    'text',
    {
      markdown: `## Relevante Seiten für **${persona.name}**\n\n${persona.role}${persona.targetGroupName ? ` · ${persona.targetGroupName}` : ''}${collectionName ? ` · Collection **${collectionName}**` : ''} · Corpus **${domainScan.url || domainScan.id}**${corpusMode ? ` (${corpusMode})` : ''}${corpusTruncated ? ' · Auszug (max. 100 Seiten)' : ''}`,
    },
    randomUUID(),
  );
  if (intro.ok) blocks.push(intro.block);

  const metrics = createUiBlock(
    'metric_grid',
    {
      title: 'Corpus',
      items: [
        { label: 'Seiten', value: corpusMetrics.corpusSize },
        {
          label: 'Ø Score',
          value: corpusMetrics.avgScore ?? '—',
          unit: corpusMetrics.avgScore != null ? '/100' : undefined,
        },
        {
          label: 'Mit Fehlern',
          value: corpusMetrics.pagesWithErrors,
          tone: corpusMetrics.pagesWithErrors > 0 ? 'warning' : 'success',
        },
      ],
    },
    randomUUID(),
  );
  if (metrics.ok) blocks.push(metrics.block);

  if (rankedPages.length > 0) {
    const table = createUiBlock(
      'data_table',
      {
        title: 'Top-Seiten (Relevanz + CHECKION-Metriken)',
        columns: ['Relevanz', 'URL', 'Score', 'A11y', 'SEO', 'Fehler', 'Warum'],
        rows: rankedPages.map((row) => [
          tierLabel(row.relevanceTier),
          row.url,
          row.overallScore ?? '—',
          row.accessibility ?? '—',
          row.seo ?? '—',
          row.errors,
          row.rationale,
        ]),
      },
      randomUUID(),
    );
    if (table.ok) blocks.push(table.block);

    const links = createUiBlock(
      'link_list',
      {
        title: 'Seiten in CHECKION',
        links: rankedPages.slice(0, 5).map((row) => ({
          label: row.url.replace(/^https?:\/\/[^/]+/, '') || row.url,
          href: row.resultsHref,
          external: true,
        })),
      },
      randomUUID(),
    );
    if (links.ok) blocks.push(links.block);
  }

  const nav = createUiBlock(
    'link_list',
    {
      title: 'Weiter',
      links: [
        { label: 'Persona in AUDION', href: preview.audionHref, external: true },
        { label: 'Domain-Scan in CHECKION', href: preview.checkionDomainHref, external: true },
      ],
    },
    randomUUID(),
  );
  if (nav.ok) blocks.push(nav.block);

  return { version: UI_LAYOUT_VERSION, blocks };
}
