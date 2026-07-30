import { randomUUID } from 'crypto';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import type { PlaybookRunResult, PlaybookStepOutcome } from '@/lib/assistant/playbooks/runner';
import { buildCheckionScanLink } from '@/lib/assistant/ui-blocks/product-links';
import { getCheckionUrl } from '@/lib/constants';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';

function sslGradeToScore(grade: string | null | undefined): number | null {
  if (!grade) return null;
  const g = grade.toUpperCase();
  if (g.startsWith('A+')) return 98;
  if (g.startsWith('A')) return 92;
  if (g.startsWith('B')) return 78;
  if (g.startsWith('C')) return 62;
  if (g.startsWith('D')) return 45;
  if (g.startsWith('F')) return 25;
  return null;
}

function computeOverallScore(outcomes: PlaybookStepOutcome[]): number | null {
  const scores: number[] = [];
  for (const o of outcomes) {
    if (o.status !== 'done' || !o.payload) continue;
    if (o.payload.kind === 'pagespeed_check') {
      scores.push(o.payload.data.performance);
      scores.push(o.payload.data.accessibility);
    }
    if (o.payload.kind === 'quick_scan') scores.push(o.payload.data.score);
    if (o.payload.kind === 'geo_analysis' && o.payload.data.overallScore != null) {
      scores.push(o.payload.data.overallScore);
    }
    if (o.payload.kind === 'ssl_check') {
      const s = sslGradeToScore(o.payload.data.grade);
      if (s != null) scores.push(s);
    }
    if (o.payload.kind === 'security_headers' && o.payload.data.score != null) {
      scores.push(o.payload.data.score);
    }
  }
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function stepDetailMarkdown(o: PlaybookStepOutcome): string {
  if (o.status === 'skipped') return `_Übersprungen:_ ${o.skipReason ?? '—'}`;
  if (o.status === 'error') return `**Fehler:** ${o.error ?? '—'}`;
  if (!o.payload) return '—';

  switch (o.payload.kind) {
    case 'pagespeed_check':
      return `Performance **${o.payload.data.performance}**, A11y **${o.payload.data.accessibility}**, SEO **${o.payload.data.seo}**`;
    case 'quick_scan':
      return `Score **${o.payload.data.score}**/100 — ${o.payload.data.stats.errors} Fehler, ${o.payload.data.stats.warnings} Warnungen`;
    case 'ssl_check':
      return `Grade **${o.payload.data.grade ?? '—'}** (${o.payload.data.status})`;
    case 'contrast_check':
      return `Ratio **${o.payload.data.ratio}**:1 — AA **${o.payload.data.score.aa}**`;
    case 'readability_check':
      return `Grade Level **${o.payload.data.score}** — ${o.payload.data.grade}`;
    case 'geo_analysis':
      return `GEO-Score **${o.payload.data.overallScore ?? '—'}**/100`;
    case 'security_headers':
      return `Grade **${o.payload.data.grade ?? '—'}** — Score **${o.payload.data.score ?? '—'}**`;
    case 'dns_check':
      return `MX: **${o.payload.data.hasMx ? 'Ja' : 'Nein'}**, SPF: **${o.payload.data.hasSpf ? 'Ja' : 'Nein'}**`;
    default:
      return '—';
  }
}

export function buildPlaybookReportLayout(result: PlaybookRunResult): UiLayout {
  const blocks: UiLayout['blocks'] = [];
  const overall = computeOverallScore(result.outcomes);

  const intro = createUiBlock(
    'text',
    {
      markdown: `## ${result.playbookLabel}\n\n**${result.url}**${overall != null ? ` — Gesamt-Score **${overall}**/100` : ''}`,
    },
    randomUUID()
  );
  if (intro.ok) blocks.push(intro.block);

  const metricItems: Array<{ label: string; value: string | number; unit?: string }> = [];
  if (overall != null) metricItems.push({ label: 'Gesamt', value: overall, unit: '/100' });

  for (const o of result.outcomes) {
    if (o.status !== 'done' || !o.payload) continue;
    if (o.payload.kind === 'pagespeed_check') {
      metricItems.push({ label: 'Performance', value: o.payload.data.performance, unit: '/100' });
      metricItems.push({ label: 'PSI A11y', value: o.payload.data.accessibility, unit: '/100' });
    }
    if (o.payload.kind === 'quick_scan') {
      metricItems.push({ label: 'Scan', value: o.payload.data.score, unit: '/100' });
    }
    if (o.payload.kind === 'geo_analysis' && o.payload.data.overallScore != null) {
      metricItems.push({ label: 'GEO', value: o.payload.data.overallScore, unit: '/100' });
    }
    if (o.payload.kind === 'ssl_check' && o.payload.data.grade) {
      metricItems.push({ label: 'SSL', value: o.payload.data.grade });
    }
    if (o.payload.kind === 'security_headers' && o.payload.data.grade) {
      metricItems.push({ label: 'Headers', value: o.payload.data.grade });
    }
    if (o.payload.kind === 'dns_check') {
      metricItems.push({ label: 'DNS MX', value: o.payload.data.hasMx ? 'OK' : '—' });
    }
  }

  if (metricItems.length > 0) {
    const metrics = createUiBlock(
      'metric_grid',
      { title: 'Audit-Scores', items: metricItems.slice(0, 8) },
      randomUUID()
    );
    if (metrics.ok) blocks.push(metrics.block);
  }

  const chartLabels: string[] = [];
  const chartValues: number[] = [];
  for (const o of result.outcomes) {
    if (o.status !== 'done' || !o.payload) continue;
    if (o.payload.kind === 'pagespeed_check') {
      chartLabels.push('Perf');
      chartValues.push(o.payload.data.performance);
      chartLabels.push('PSI A11y');
      chartValues.push(o.payload.data.accessibility);
    }
    if (o.payload.kind === 'quick_scan') {
      chartLabels.push('WCAG Scan');
      chartValues.push(o.payload.data.score);
    }
    if (o.payload.kind === 'geo_analysis' && o.payload.data.overallScore != null) {
      chartLabels.push('GEO');
      chartValues.push(o.payload.data.overallScore);
    }
  }
  if (chartLabels.length > 0) {
    const chart = createUiBlock(
      'chart',
      {
        title: 'Score-Vergleich',
        chartType: 'bar',
        labels: chartLabels,
        datasets: [{ label: 'Score', values: chartValues }],
      },
      randomUUID()
    );
    if (chart.ok) blocks.push(chart.block);
  }

  const statusRows = result.outcomes.map((o) => [
    o.label,
    o.status === 'done' ? '✓' : o.status === 'skipped' ? '—' : '✗',
    stepDetailMarkdown(o).replace(/\*\*/g, ''),
  ]);
  const table = createUiBlock(
    'data_table',
    {
      title: 'Schritt-Details',
      columns: ['Schritt', 'Status', 'Ergebnis'],
      rows: statusRows,
    },
    randomUUID()
  );
  if (table.ok) blocks.push(table.block);

  const scanOutcome = result.outcomes.find(
    (o) => o.status === 'done' && o.payload?.kind === 'quick_scan'
  );
  const links: Array<{ label: string; href: string; external?: boolean }> = [];
  if (scanOutcome?.payload?.kind === 'quick_scan') {
    links.push(buildCheckionScanLink(scanOutcome.payload.data.id, 'Scan in CHECKION'));
  }
  const checkionBase = getCheckionUrl().replace(/\/+$/, '');
  links.push({
    label: 'CHECKION öffnen',
    href: checkionBase,
    external: true,
  });
  const linkBlock = createUiBlock('link_list', { title: 'Links', links }, randomUUID());
  if (linkBlock.ok) blocks.push(linkBlock.block);

  const failedOptional = result.outcomes.filter((o) => o.status === 'error');
  if (failedOptional.length > 0) {
    const alert = createUiBlock(
      'alert',
      {
        tone: 'warning',
        title: 'Einige optionale Schritte sind fehlgeschlagen',
        message: failedOptional.map((o) => `${o.label}: ${o.error}`).join(' · '),
      },
      randomUUID()
    );
    if (alert.ok) blocks.push(alert.block);
  }

  return { version: UI_LAYOUT_VERSION, blocks };
}
