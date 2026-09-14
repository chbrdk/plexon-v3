import type { MetronDashboardShareSnapshot } from '@/lib/assistant/ui-blocks/types';
import { UI_BLOCK_LIMITS } from '@/lib/assistant/ui-blocks/types';

export function parseMetronDashboardShareSnapshot(
  raw: unknown,
): MetronDashboardShareSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) return null;
  const dashboardId = typeof o.dashboardId === 'string' ? o.dashboardId.trim() : '';
  const name = typeof o.name === 'string' ? o.name.trim() : '';
  if (!dashboardId || !name) return null;

  const metrics: MetronDashboardShareSnapshot['metrics'] = [];
  if (Array.isArray(o.metrics)) {
    for (const row of o.metrics.slice(0, UI_BLOCK_LIMITS.maxMetrics)) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const label = typeof r.label === 'string' ? r.label.trim() : '';
      if (!label) continue;
      const value = r.value;
      if (typeof value === 'number' && Number.isFinite(value)) {
        metrics.push({ label: label.slice(0, 256), value });
      } else if (typeof value === 'string' && value.trim()) {
        metrics.push({ label: label.slice(0, 256), value: value.trim().slice(0, 256) });
      }
    }
  }

  let chart: MetronDashboardShareSnapshot['chart'] = null;
  if (o.chart && typeof o.chart === 'object') {
    const c = o.chart as Record<string, unknown>;
    const title = typeof c.title === 'string' ? c.title.trim() : '';
    const labels = Array.isArray(c.labels)
      ? c.labels.filter((l): l is string => typeof l === 'string' && Boolean(l.trim()))
      : [];
    const values = Array.isArray(c.values)
      ? c.values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
      : [];
    const n = Math.min(labels.length, values.length, UI_BLOCK_LIMITS.maxChartLabels);
    if (title && n >= 1) {
      chart = {
        title: title.slice(0, 256),
        labels: labels.slice(0, n).map((l) => l.slice(0, 256)),
        values: values.slice(0, n),
      };
    }
  }

  const href =
    typeof o.href === 'string' && o.href.trim().startsWith('http') ? o.href.trim() : null;
  const platformProjectId =
    typeof o.platformProjectId === 'string' && o.platformProjectId.trim()
      ? o.platformProjectId.trim()
      : null;

  return {
    version: 1,
    dashboardId,
    name,
    platformProjectId,
    metrics,
    chart,
    href,
  };
}
