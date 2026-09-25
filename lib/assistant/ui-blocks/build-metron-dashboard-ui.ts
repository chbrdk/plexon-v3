/**
 * Auto UI after METRON dashboards_list / dashboard_get / dashboard_summarize.
 * Spec: assistant-metron-mcp.md
 */

import { randomUUID } from 'crypto';
import { getMetronUrl } from '@/lib/constants';
import type {
  MetronDashboardShareSnapshot,
  UiBlock,
  UiLayout,
} from '@/lib/assistant/ui-blocks/types';
import { UI_BLOCK_LIMITS, UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
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
  /** First chart (share v1 compat). Prefer `charts` for multi-chart Auto-UI. */
  chart: {
    title: string;
    labels: string[];
    values: number[];
  } | null;
  charts: Array<{
    title: string;
    labels: string[];
    values: number[];
  }>;
  platformProjectId?: string | null;
};

export type MetronDashboardSummarizePayload = {
  id: string;
  name: string;
  teaser: string;
  metrics: Array<{ label: string; value: number | string }>;
};

type ToolMeta = {
  source: string;
  toolCallId: string;
  metronShareSnapshot?: MetronDashboardShareSnapshot;
};

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

    const charts: MetronDashboardGetPayload['charts'] = [];
    for (const w of widgets) {
      if (w.kind !== 'chart') continue;
      if (charts.length >= UI_BLOCK_LIMITS.maxChartSeries) break;
      const points = Array.isArray(w.chartPoints) ? w.chartPoints : [];
      const usable = points
        .map((p) => ({
          label: typeof p.label === 'string' ? p.label.trim() : '',
          value: typeof p.value === 'number' && Number.isFinite(p.value) ? p.value : null,
        }))
        .filter((p): p is { label: string; value: number } => Boolean(p.label) && p.value != null)
        .slice(0, UI_BLOCK_LIMITS.maxChartLabels);
      if (usable.length < 1) continue;
      charts.push({
        title:
          typeof w.title === 'string' && w.title.trim()
            ? w.title.trim()
            : 'METRON chart',
        labels: usable.map((p) => p.label.slice(0, 256)),
        values: usable.map((p) => p.value),
      });
    }

    return {
      id,
      name,
      metrics,
      chart: charts[0] ?? null,
      charts,
    };
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

export function buildMetronShareSnapshot(input: {
  dashboardId: string;
  name: string;
  metrics: Array<{ label: string; value: number | string }>;
  chart: MetronDashboardGetPayload['chart'];
  charts?: MetronDashboardGetPayload['charts'];
  platformProjectId?: string | null;
}): MetronDashboardShareSnapshot {
  const href = buildMetronDashboardHref(input.dashboardId);
  const charts = (input.charts?.length ? input.charts : input.chart ? [input.chart] : []).slice(
    0,
    UI_BLOCK_LIMITS.maxChartSeries,
  );
  return {
    version: 1,
    dashboardId: input.dashboardId,
    name: input.name,
    platformProjectId: input.platformProjectId ?? null,
    metrics: input.metrics.slice(0, UI_BLOCK_LIMITS.maxMetrics),
    chart: charts[0] ?? null,
    ...(charts.length > 1 ? { charts } : {}),
    href,
  };
}

/** Rebuild Auto-UI blocks from a stored public share snapshot. */
export function buildMetronShareUiLayout(snapshot: MetronDashboardShareSnapshot): UiLayout {
  const meta = { source: 'plexon_ui', toolCallId: 'share' };
  const blocks: UiBlock[] = [];
  appendMetricGrid(blocks, snapshot.name, snapshot.metrics, meta);
  const charts =
    snapshot.charts?.length ? snapshot.charts : snapshot.chart ? [snapshot.chart] : [];
  for (const c of charts.slice(0, UI_BLOCK_LIMITS.maxChartSeries)) {
    const chart = createUiBlock(
      'chart',
      {
        title: c.title,
        chartType: 'bar' as const,
        labels: c.labels,
        datasets: [{ label: c.title.slice(0, 256), values: c.values }],
      },
      randomUUID(),
      meta,
    );
    if (chart.ok) blocks.push(chart.block);
  }
  if (snapshot.href) {
    appendLinkBlock(blocks, snapshot.name, 'Open in METRON', snapshot.href, meta);
  }
  return { version: UI_LAYOUT_VERSION, blocks };
}

export function findMetronShareSnapshotInBlocks(
  blocks: UiBlock[],
): MetronDashboardShareSnapshot | null {
  for (const b of blocks) {
    const snap = b.meta?.metronShareSnapshot;
    if (snap?.version === 1 && snap.dashboardId) return snap;
  }
  return null;
}

export function buildMetronDashboardSummarizeBlocks(
  summary: MetronDashboardSummarizePayload,
  meta: ToolMeta,
): UiBlock[] {
  const href = buildMetronDashboardHref(summary.id);
  if (!href) return [];
  const snapshot = buildMetronShareSnapshot({
    dashboardId: summary.id,
    name: summary.name,
    metrics: summary.metrics,
    chart: null,
  });
  const blockMeta = { ...meta, metronShareSnapshot: snapshot };
  const blocks: UiBlock[] = [];
  appendMetricGrid(blocks, summary.name, summary.metrics, blockMeta);
  appendLinkBlock(blocks, summary.name, summary.teaser || 'Open in METRON', href, blockMeta);
  return blocks;
}

export function buildMetronDashboardGetBlocks(
  payload: MetronDashboardGetPayload,
  meta: ToolMeta,
): UiBlock[] {
  const href = buildMetronDashboardHref(payload.id);
  const charts = payload.charts?.length
    ? payload.charts
    : payload.chart
      ? [payload.chart]
      : [];
  if (!href && !payload.metrics.length && !charts.length) return [];
  const snapshot = buildMetronShareSnapshot({
    dashboardId: payload.id,
    name: payload.name,
    metrics: payload.metrics,
    chart: charts[0] ?? null,
    charts,
    platformProjectId: payload.platformProjectId,
  });
  const blockMeta = { ...meta, metronShareSnapshot: snapshot };
  const blocks: UiBlock[] = [];
  appendMetricGrid(blocks, payload.name, payload.metrics, blockMeta);

  for (const c of charts.slice(0, UI_BLOCK_LIMITS.maxChartSeries)) {
    const chart = createUiBlock(
      'chart',
      {
        title: c.title,
        chartType: 'bar' as const,
        labels: c.labels,
        datasets: [{ label: c.title.slice(0, 256), values: c.values }],
      },
      randomUUID(),
      blockMeta,
    );
    if (chart.ok) blocks.push(chart.block);
  }

  if (href) {
    appendLinkBlock(blocks, payload.name, 'Open in METRON', href, blockMeta);
  }
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

export type MetronKpiListItem = {
  id: string;
  name: string;
  status?: string;
};

export type MetronKpiEvaluatePayload = {
  id: string;
  name: string;
  value: number | string;
  periodLabel?: string;
};

export type MetronDatasetListItem = {
  id: string;
  name: string;
  honestyHint?: string;
};

export function parseMetronKpisListPayload(text: string): MetronKpiListItem[] | null {
  try {
    const raw = JSON.parse(text) as { items?: unknown; error?: unknown };
    if (!raw || typeof raw !== 'object' || raw.error) return null;
    if (!Array.isArray(raw.items)) return null;
    const items: MetronKpiListItem[] = [];
    for (const row of raw.items) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const id = typeof r.id === 'string' ? r.id.trim() : '';
      const name = typeof r.name === 'string' ? r.name.trim() : '';
      if (!id || !name) continue;
      items.push({
        id,
        name,
        status: typeof r.status === 'string' ? r.status : undefined,
      });
    }
    return items;
  } catch {
    return null;
  }
}

export function parseMetronKpiEvaluatePayload(text: string): MetronKpiEvaluatePayload | null {
  try {
    const raw = JSON.parse(text) as {
      error?: unknown;
      kpiId?: string;
      value?: number | null;
      status?: string;
      provenance?: { period?: { grain?: string; window?: string } };
    };
    if (!raw || typeof raw !== 'object' || raw.error) return null;
    if (raw.value == null) return null;
    const id = typeof raw.kpiId === 'string' ? raw.kpiId.trim() : 'kpi';
    const period = raw.provenance?.period;
    return {
      id,
      name: id,
      value: raw.value,
      periodLabel: period
        ? `${period.grain ?? ''} · ${period.window ?? ''}`.trim()
        : undefined,
    };
  } catch {
    return parseMetronKpiSummarizePayload(text);
  }
}

export function parseMetronKpiSummarizePayload(text: string): MetronKpiEvaluatePayload | null {
  const link = text.match(/Deep link:\s*\/kpis(?:\?focus=)?([^\s]+)?/i);
  const name = text.match(/^KPI:\s*(.+)$/m);
  const valueLine = text.match(/^Value:\s*(.+)$/m);
  if (!valueLine?.[1]) return null;
  const rawValue = valueLine[1].replace(/\s*\[error\]\s*$/i, '').trim();
  if (rawValue === '—') return null;
  const num = Number(rawValue);
  const period = text.match(/^Period:\s*(.+)$/m)?.[1]?.trim();
  const focus = link?.[1] ? decodeURIComponent(link[1].trim()) : '';
  const title = name?.[1]?.trim() || focus || 'KPI';
  return {
    id: focus || title,
    name: title,
    value: Number.isFinite(num) ? num : rawValue,
    periodLabel: period,
  };
}

export function parseMetronDatasetsListPayload(text: string): MetronDatasetListItem[] | null {
  try {
    const raw = JSON.parse(text) as { items?: unknown; error?: unknown };
    if (!raw || typeof raw !== 'object' || raw.error) return null;
    if (!Array.isArray(raw.items)) return null;
    const items: MetronDatasetListItem[] = [];
    for (const row of raw.items) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const id = typeof r.id === 'string' ? r.id.trim() : '';
      const name = typeof r.name === 'string' ? r.name.trim() : '';
      if (!id || !name) continue;
      const honesty =
        typeof r.evaluateHonesty === 'string'
          ? r.evaluateHonesty
          : typeof r.rowHonesty === 'string'
            ? r.rowHonesty
            : undefined;
      items.push({
        id,
        name,
        honestyHint:
          honesty === 'evaluated_on_preview_sample'
            ? 'Preview sample'
            : honesty || undefined,
      });
    }
    return items;
  } catch {
    return null;
  }
}

export function parseMetronDatasetGetPayload(text: string): MetronDatasetListItem | null {
  try {
    const raw = JSON.parse(text) as {
      error?: unknown;
      id?: string;
      name?: string;
      evaluateHonesty?: string;
      warnings?: string[];
    };
    if (!raw || typeof raw !== 'object' || raw.error) return null;
    const id = typeof raw.id === 'string' ? raw.id.trim() : '';
    const name = typeof raw.name === 'string' ? raw.name.trim() : id;
    if (!id) return null;
    const warn = Array.isArray(raw.warnings) ? raw.warnings : [];
    const honesty =
      raw.evaluateHonesty === 'evaluated_on_preview_sample' ||
      warn.includes('evaluated_on_preview_sample')
        ? 'Preview sample'
        : undefined;
    return { id, name: name || id, honestyHint: honesty };
  } catch {
    return null;
  }
}

function buildMetronKpiHref(kpiId: string): string | null {
  const base = metronBase();
  if (!base || !kpiId.trim()) return null;
  return `${base}/kpis?focus=${encodeURIComponent(kpiId.trim())}`;
}

function buildMetronDatasetHref(datasetId: string): string | null {
  const base = metronBase();
  if (!base || !datasetId.trim()) return null;
  return `${base}/datasets?focus=${encodeURIComponent(datasetId.trim())}`;
}

export function buildMetronKpiListBlocks(
  items: MetronKpiListItem[],
  meta: { source: string; toolCallId: string },
): UiBlock[] {
  const blocks: UiBlock[] = [];
  const metrics = items.slice(0, UI_BLOCK_LIMITS.maxMetrics).map((i) => ({
    label: i.name,
    value: i.status ?? '—',
  }));
  appendMetricGrid(blocks, 'METRON KPIs', metrics, meta);
  const base = metronBase();
  if (base && items[0]) {
    const href = buildMetronKpiHref(items[0].id);
    if (href) appendLinkBlock(blocks, 'KPIs', 'Open in METRON', href, meta);
  }
  return blocks;
}

export function buildMetronKpiEvaluateBlocks(
  payload: MetronKpiEvaluatePayload,
  meta: { source: string; toolCallId: string },
): UiBlock[] {
  const blocks: UiBlock[] = [];
  const label = payload.periodLabel
    ? `${payload.name} (${payload.periodLabel})`
    : payload.name;
  appendMetricGrid(blocks, 'KPI evaluate', [{ label, value: payload.value }], meta);
  const href = buildMetronKpiHref(payload.id);
  if (href) appendLinkBlock(blocks, payload.name, 'Open in METRON', href, meta);
  return blocks;
}

export function buildMetronDatasetListBlocks(
  items: MetronDatasetListItem[],
  meta: { source: string; toolCallId: string },
): UiBlock[] {
  const blocks: UiBlock[] = [];
  const base = metronBase();
  const links = items.slice(0, UI_BLOCK_LIMITS.maxLinks).map((i) => ({
    label: i.honestyHint ? `${i.name} · ${i.honestyHint}` : i.name,
    href: base
      ? `${base}/datasets?focus=${encodeURIComponent(i.id)}`
      : `#dataset-${encodeURIComponent(i.id)}`,
    external: true as const,
  }));
  if (!links.length) return blocks;
  const block = createUiBlock(
    'link_list',
    { title: 'METRON Datasets', links },
    randomUUID(),
    meta,
  );
  if (block.ok) blocks.push(block.block);
  return blocks;
}

export function buildMetronDatasetGetBlocks(
  item: MetronDatasetListItem,
  meta: { source: string; toolCallId: string },
): UiBlock[] {
  const blocks: UiBlock[] = [];
  const href = buildMetronDatasetHref(item.id);
  const label = item.honestyHint ? `${item.name} · ${item.honestyHint}` : item.name;
  if (href) appendLinkBlock(blocks, 'Dataset', label, href, meta);
  return blocks;
}

export function isMetronKpisListToolName(toolName: string): boolean {
  return toolName.replace(/\./g, '_') === 'metron_kpis_list';
}

export function isMetronKpiEvaluateToolName(toolName: string): boolean {
  const n = toolName.replace(/\./g, '_');
  return n === 'metron_kpi_evaluate' || n === 'metron_kpi_summarize';
}

export function isMetronDatasetsListToolName(toolName: string): boolean {
  return toolName.replace(/\./g, '_') === 'metron_datasets_list';
}

export function isMetronDatasetGetToolName(toolName: string): boolean {
  return toolName.replace(/\./g, '_') === 'metron_dataset_get';
}
