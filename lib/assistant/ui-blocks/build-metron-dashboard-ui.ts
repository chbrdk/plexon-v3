/**
 * Auto UI after METRON dashboards_list / dashboard_summarize.
 * Spec: assistant-metron-mcp.md
 */

import { randomUUID } from 'crypto';
import { getMetronUrl } from '@/lib/constants';
import type { UiBlock } from '@/lib/assistant/ui-blocks/types';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';

export type MetronDashboardListItem = {
  id: string;
  name: string;
  widgetCount?: number;
  status?: string;
  platformProjectId?: string;
};

function metronBase(): string {
  return getMetronUrl()?.replace(/\/+$/, '') ?? '';
}

export function buildMetronDashboardHref(dashboardId: string): string | null {
  const base = metronBase();
  if (!base || !dashboardId.trim()) return null;
  return `${base}/dashboards/${encodeURIComponent(dashboardId.trim())}`;
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

/** Parse summarize plain text for id + title (Deep link: /dashboards/…). */
export function parseMetronDashboardSummarizePayload(text: string): {
  id: string;
  name: string;
  teaser: string;
} | null {
  const link = text.match(/Deep link:\s*\/dashboards\/([^\s]+)/i);
  const name = text.match(/^Dashboard:\s*(.+)$/m);
  if (!link?.[1]) return null;
  const id = decodeURIComponent(link[1].trim());
  const title = name?.[1]?.trim() || id;
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('- '))
    .slice(0, 3)
    .map((l) => l.replace(/^- /, ''));
  return { id, name: title, teaser: lines.join(' · ') || 'Open dashboard' };
}

export function buildMetronDashboardListBlocks(
  items: MetronDashboardListItem[],
  meta: { source: string; toolCallId: string },
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
  summary: { id: string; name: string; teaser: string },
  meta: { source: string; toolCallId: string },
): UiBlock[] {
  const href = buildMetronDashboardHref(summary.id);
  if (!href) return [];
  const block = createUiBlock(
    'link_list',
    {
      title: summary.name,
      links: [{ label: summary.teaser || 'Open in METRON', href, external: true }],
    },
    randomUUID(),
    meta,
  );
  return block.ok ? [block.block] : [];
}

export function isMetronDashboardsListToolName(toolName: string): boolean {
  const n = toolName.replace(/\./g, '_');
  return n === 'metron_dashboards_list';
}

export function isMetronDashboardSummarizeToolName(toolName: string): boolean {
  const n = toolName.replace(/\./g, '_');
  return n === 'metron_dashboard_summarize';
}
