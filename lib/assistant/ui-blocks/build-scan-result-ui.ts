import { randomUUID } from 'crypto';
import type { UiLayout, UiTone } from '@/lib/assistant/ui-blocks/types';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import { buildCheckionScanLink } from '@/lib/assistant/ui-blocks/product-links';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';

export type ScanIssuePreview = {
  code: string;
  type: string;
  message: string;
  selector: string;
};

export type ScanResultPreview = {
  id: string;
  url: string;
  score: number;
  stats: { errors: number; warnings: number; notices: number; total: number };
  issues: ScanIssuePreview[];
};

export type PageSpeedPreview = {
  url: string;
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
};

function scoreTone(score: number): UiTone {
  if (score >= 90) return 'success';
  if (score >= 70) return 'warning';
  return 'error';
}

export function buildScanResultLayout(
  scan: ScanResultPreview,
  options: { error?: string } = {}
): UiLayout {
  const blocks: UiLayout['blocks'] = [];

  const metrics = createUiBlock(
    'metric_grid',
    {
      title: 'Scan-Ergebnis',
      items: [
        { label: 'Score', value: scan.score, unit: '/100', tone: scoreTone(scan.score) },
        { label: 'Fehler', value: scan.stats.errors, tone: scan.stats.errors > 0 ? 'error' : 'success' },
        { label: 'Warnungen', value: scan.stats.warnings, tone: scan.stats.warnings > 0 ? 'warning' : 'neutral' },
        { label: 'Hinweise', value: scan.stats.notices },
      ],
    },
    randomUUID()
  );
  if (metrics.ok) blocks.push(metrics.block);

  const topIssues = scan.issues.slice(0, 10);
  if (topIssues.length > 0) {
    const table = createUiBlock(
      'data_table',
      {
        title: 'Top Issues',
        columns: ['Regel', 'Impact', 'Selektor'],
        rows: topIssues.map((i) => [
          i.code.split('.').pop() ?? i.code,
          i.type,
          i.selector.slice(0, 80),
        ]),
      },
      randomUUID()
    );
    if (table.ok) blocks.push(table.block);
  }

  const kv = createUiBlock(
    'key_value_list',
    {
      items: [
        { label: 'URL', value: scan.url },
        { label: 'Scan-ID', value: scan.id },
      ],
    },
    randomUUID()
  );
  if (kv.ok) blocks.push(kv.block);

  const linkBlock = createUiBlock(
    'link_list',
    { links: [buildCheckionScanLink(scan.id)] },
    randomUUID()
  );
  if (linkBlock.ok) blocks.push(linkBlock.block);

  if (options.error?.trim()) {
    const alert = createUiBlock(
      'alert',
      { message: options.error.trim(), tone: 'error' },
      randomUUID()
    );
    if (alert.ok) blocks.push(alert.block);
  }

  return { version: UI_LAYOUT_VERSION, blocks };
}

export function buildPageSpeedLayout(
  data: PageSpeedPreview,
  options: { error?: string } = {}
): UiLayout {
  const blocks: UiLayout['blocks'] = [];

  const metrics = createUiBlock(
    'metric_grid',
    {
      title: 'PageSpeed Insights',
      items: [
        { label: 'Performance', value: data.performance, unit: '/100', tone: scoreTone(data.performance) },
        { label: 'Accessibility', value: data.accessibility, unit: '/100', tone: scoreTone(data.accessibility) },
        { label: 'Best Practices', value: data.bestPractices, unit: '/100', tone: scoreTone(data.bestPractices) },
        { label: 'SEO', value: data.seo, unit: '/100', tone: scoreTone(data.seo) },
      ],
    },
    randomUUID()
  );
  if (metrics.ok) blocks.push(metrics.block);

  const chart = createUiBlock(
    'chart',
    {
      title: 'Scores',
      chartType: 'bar',
      labels: ['Performance', 'A11y', 'Best Practices', 'SEO'],
      datasets: [{ label: 'Score', values: [data.performance, data.accessibility, data.bestPractices, data.seo] }],
    },
    randomUUID()
  );
  if (chart.ok) blocks.push(chart.block);

  const kv = createUiBlock(
    'key_value_list',
    { items: [{ label: 'URL', value: data.url }] },
    randomUUID()
  );
  if (kv.ok) blocks.push(kv.block);

  if (options.error?.trim()) {
    const alert = createUiBlock(
      'alert',
      { message: options.error.trim(), tone: 'error' },
      randomUUID()
    );
    if (alert.ok) blocks.push(alert.block);
  }

  return { version: UI_LAYOUT_VERSION, blocks };
}
