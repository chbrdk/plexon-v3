/**
 * Auto UI after METRON dashboards_list / dashboard_get / dashboard_summarize.
 * Spec: assistant-metron-mcp.md
 */

import { randomUUID } from 'crypto';
import { getMetronUrl } from '@/lib/constants';
import type { UiBlock } from '@/lib/assistant/ui-blocks/types';
import { UI_BLOCK_LIMITS } from '@/lib/assistant/ui-blocks/types';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';

export type MetronDashboardListItem = {
  id: string;
  name: string;
  widgetCount?: number;
  status?: string;
  platformProjectId?: string;
};

export type MetronDashboardGetPayload = {
  id: string;
  name: string;
  metrics: Array<{ label: string; value: number | string }>;
  chart: {
    title: string;
    labels: string[];
    values: number[];
  } | null;
};

export type MetronDashboardSummarizePayload = {
  id: string;
  name: string;
  teaser: string;
  metrics: Array<{ label: string; value: number | string }>;
};

type ToolMeta = { source: string; toolCallId: string };

function metronBase(): string {
  return getMetronUrl()?.replace(/\/+$/, '') ?? '';
}

export function buildMetronDashboardHref(dashboardId: string): string | null {
  const base = metronBase();
  if (!base || !dashboardId.trim()) return null;
  return `${base}/dashboards/${encodeURIComponent(dashboardId.trim())}`;
}

function appendLinkBlock(
  blocks: UiBlock[],
  title: string,
  label: string,
  href: string,
  meta: ToolMeta,
): void {
  const block = createUiBlock(
    'link_list',
    { title, links: [{ label, href, external: true as const }] },
    randomUUID(),
    meta,
  );
  if (block.ok) blocks.push(block.block);
}

function appendMetricGrid(
  blocks: UiBlock[],
  title: string,
  metrics: Array<{ label: string; value: number | string }>,
  meta: ToolMeta,
): void {
  if (!metrics.length) return;
  const block = createUiBlock(
    'metric_grid',
    {
      title,
      items: metrics.slice(0, UI_BLOCK_LIMITS.maxMetrics).map((m) => ({
        label: m.label.slice(0, 256),
        value: m.value,
      })),
    },
    randomUUID(),
    meta,
  );
  if (block.ok) blocks.push(block.block);
}

export function parseMetronDashboardsListPayload(text: string): MetronDashboardListItem[] | null {
  try {
    const raw = JSON.parse(text) as { items?: unknown; error?: unknown };
    if (!raw || typeof raw !== 'object' || raw.error) return null;
    if (!Array.isArray(raw.items)) return null;
    const items: MetronDashboardListItem[] = [];
    for (const row of raw.items) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const id = typeof r.id === 'string' ? r.id.trim() : '';
      const name = typeof r.name === 'string' ? r.name.trim() : '';
      if (!id || !name) continue;
      items.push({
        id,
        name,
        widgetCount: typeof r.widgetCount === 'number' ? r.widgetCount : undefined,
        status: typeof r.status === 'string' ? r.status : undefined,
        platformProjectId:
          typeof r.platformProjectId === 'string' ? r.platformProjectId : undefined,
      });
    }
    return items;
  } catch {
    return null;
  }
}

/** Parse summarize plain text for id + title + KPI lines. */
export function parseMetronDashboardSummarizePayload(
  text: string,
): MetronDashboardSummarizePayload | null {
  const link = text.match(/Deep link:\s*\/dashboards\/([^\s]+)/i);
  const name = text.match(/^Dashboard:\s*(.+)$/m);
  if (!link?.[1]) return null;
  const id = decodeURIComponent(link[1].trim());
  const title = name?.[1]?.trim() || id;
  const bulletLines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('- '));

  const metrics: Array<{ label: string; value: number | string }> = [];
  for (const line of bulletLines) {
    const body = line.replace(/^- /, '');
    const m = body.match(/^(.+?)\s*\(([^)]+)\):\s*(.+)$/);
    if (!m) continue;
    const kind = m[2].trim().toLowerCase();
    if (kind !== 'kpi_tile' && kind !== 'gauge') continue;
    const rawValue = m[3].replace(/\s*\[error\]\s*$/i, '').trim();
    if (rawValue === '—') continue;
    const num = Number(rawValue);
    metrics.push({
      label: m[1].trim(),
      value: Number.isFinite(num) ? num : rawValue,
    });
  }

  const teaserLines = bulletLines.slice(0, 3).map((l) => l.replace(/^- /, ''));
  return {
    id,
    name: title,
    teaser: teaserLines.join(' · ') || 'Open dashboard',
    metrics,
  };
}

export function parseMetronDashboardGetPayload(text: string): MetronDashboardGetPayload | null {
  try {
    const raw = JSON.parse(text) as {
      error?: unknown;
      dashboard?: {
        id?: string;
        name?: string;
        widgets?: Array<{
          id?: string;
          title?: string;
          kind?: string;
          chartPoints?: Array<{ label?: string; value?: number }>;
        }>;
      };
      evaluations?: Record<string, { value?: number | null; status?: string }>;
    };
    if (!raw || typeof raw !== 'object' || raw.error) return null;
    const d = raw.dashboard;
    const id = typeof d?.id === 'string' ? d.id.trim() : '';
    if (!id) return null;
    const name = typeof d?.name === 'string' && d.name.trim() ? d.name.trim() : id;
    const evals = raw.evaluations ?? {};
    const widgets = Array.isArray(d?.widgets) ? d.widgets : [];

    const metrics: Array<{ label: string; value: number | string }> = [];
    for (const w of widgets) {
      const kind = typeof w.kind === 'string' ? w.kind : '';
      if (kind !== 'kpi_tile' && kind !== 'gauge') continue;
      const wid = typeof w.id === 'string' ? w.id : '';
      const label = typeof w.title === 'string' && w.title.trim() ? w.title.trim() : wid;
      if (!label) continue;
      const ev = wid ? evals[wid] : undefined;
      if (ev?.value == null) continue;
      metrics.push({ label, value: ev.value });
    }

    let chart: MetronDashboardGetPayload['chart'] = null;
    for (const w of widgets) {
      if (w.kind !== 'chart') continue;
      const points = Array.isArray(w.chartPoints) ? w.chartPoints : [];
      const usable = points
        .map((p) => ({
          label: typeof p.label === 'string' ? p.label.trim() : '',
          value: typeof p.value === 'number' && Number.isFinite(p.value) ? p.value : null,
        }))
        .filter((p): p is { label: string; value: number } => Boolean(p.label) && p.value != null)
        .slice(0, UI_BLOCK_LIMITS.maxChartLabels);
      if (usable.length < 1) continue;
      chart = {
        title:
          typeof w.title === 'string' && w.title.trim()
            ? w.title.trim()
            : 'METRON chart',
        labels: usable.map((p) => p.label.slice(0, 256)),
        values: usable.map((p) => p.value),
      };
      break;
    }

    return { id, name, metrics, chart };
  } catch {
    return null;
  }
}

export function buildMetronDashboardListBlocks(
  items: MetronDashboardListItem[],
  meta: ToolMeta,
): UiBlock[] {
  const links = items
    .map((item) => {
      const href = buildMetronDashboardHref(item.id);
      if (!href) return null;
      const bits = [
        item.name,
        item.widgetCount != null ? `${item.widgetCount} tiles` : null,
        item.status,
      ].filter(Boolean);
      return { label: bits.join(' · '), href, external: true as const };
    })
    .filter((x): x is { label: string; href: string; external: true } => Boolean(x));

  if (!links.length) return [];
  const block = createUiBlock(
    'link_list',
    { title: 'METRON Dashboards', links },
    randomUUID(),
    meta,
  );
  return block.ok ? [block.block] : [];
}

export function buildMetronDashboardSummarizeBlocks(
  summary: MetronDashboardSummarizePayload,
  meta: ToolMeta,
): UiBlock[] {
  const href = buildMetronDashboardHref(summary.id);
  if (!href) return [];
  const blocks: UiBlock[] = [];
  appendMetricGrid(blocks, summary.name, summary.metrics, meta);
  appendLinkBlock(blocks, summary.name, summary.teaser || 'Open in METRON', href, meta);
  return blocks;
}

export function buildMetronDashboardGetBlocks(
  payload: MetronDashboardGetPayload,
  meta: ToolMeta,
): UiBlock[] {
  const href = buildMetronDashboardHref(payload.id);
  if (!href) return [];
  const blocks: UiBlock[] = [];
  appendMetricGrid(blocks, payload.name, payload.metrics, meta);

  if (payload.chart) {
    const chart = createUiBlock(
      'chart',
      {
        title: payload.chart.title,
        chartType: 'bar' as const,
        labels: payload.chart.labels,
        datasets: [{ label: payload.chart.title.slice(0, 256), values: payload.chart.values }],
      },
      randomUUID(),
      meta,
    );
    if (chart.ok) blocks.push(chart.block);
  }

  appendLinkBlock(blocks, payload.name, 'Open in METRON', href, meta);
  return blocks;
}

export function isMetronDashboardsListToolName(toolName: string): boolean {
  const n = toolName.replace(/\./g, '_');
  return n === 'metron_dashboards_list';
}

export function isMetronDashboardSummarizeToolName(toolName: string): boolean {
  const n = toolName.replace(/\./g, '_');
  return n === 'metron_dashboard_summarize';
}

export function isMetronDashboardGetToolName(toolName: string): boolean {
  const n = toolName.replace(/\./g, '_');
  return n === 'metron_dashboard_get';
}
