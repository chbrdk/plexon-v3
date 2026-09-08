import { randomUUID } from 'crypto';
import type { UiBlock } from '@/lib/assistant/ui-blocks/types';
import { UI_BLOCK_LIMITS } from '@/lib/assistant/ui-blocks/types';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';
import {
  buildVideonFramePosterUrl,
  buildVideonMediaHref,
} from '@/lib/assistant/ui-blocks/product-links';

export type VideonMediaSearchHit = {
  id?: string;
  mediaAssetId?: string;
  sceneKey?: string | null;
  mediaFilename?: string;
  startMs?: number | null;
  endMs?: number | null;
  platformProjectId?: string | null;
  projectName?: string | null;
  searchText?: string;
  href?: string | null;
};

export type VideonMediaSearchPayload = {
  query?: string;
  count?: number;
  items?: VideonMediaSearchHit[];
};

function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function timingLabel(hit: VideonMediaSearchHit): string | undefined {
  if (typeof hit.startMs === 'number' && typeof hit.endMs === 'number') {
    return `${formatClock(hit.startMs)}–${formatClock(hit.endMs)}`;
  }
  if (typeof hit.startMs === 'number') return formatClock(hit.startMs);
  return undefined;
}

function durationLabel(hit: VideonMediaSearchHit): string | undefined {
  if (
    typeof hit.startMs !== 'number' ||
    typeof hit.endMs !== 'number' ||
    hit.endMs < hit.startMs
  ) {
    return undefined;
  }
  return formatClock(hit.endMs - hit.startMs);
}

function sceneLabel(hit: VideonMediaSearchHit, index: number): string {
  const raw = hit.sceneKey?.trim();
  if (raw) {
    const match = raw.match(/(\d+)/);
    if (match) return `Szene ${Number(match[1])}`;
    return raw;
  }
  return `Szene ${index + 1}`;
}

function hitAtMs(hit: VideonMediaSearchHit): number {
  if (typeof hit.startMs === 'number' && hit.startMs >= 0) return hit.startMs;
  if (typeof hit.endMs === 'number') return Math.max(0, Math.floor(hit.endMs / 2));
  return 1000;
}

/** Parse MCP tool text/JSON into a media_search payload. */
export function parseVideonMediaSearchPayload(raw: string): VideonMediaSearchPayload | null {
  const text = raw.trim();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const row = parsed as VideonMediaSearchPayload;
    if (!Array.isArray(row.items)) return null;
    return row;
  } catch {
    return null;
  }
}

export function isVideonMediaSearchToolName(name: string): boolean {
  const n = name.replace(/\./g, '_');
  return n === 'videon_media_search';
}

/**
 * Build video_hit_strip from VIDEON MCP media_search payload.
 * Spec: assistant-videon-mcp.md
 */
export function buildVideonMediaSearchBlocks(
  payload: VideonMediaSearchPayload,
  meta?: UiBlock['meta'],
): UiBlock[] {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const mapped = items
    .map((hit, index) => {
      const mediaAssetId = hit.mediaAssetId?.trim() ?? '';
      const platformProjectId = hit.platformProjectId?.trim() ?? '';
      const relativeHref = hit.href?.trim() ?? '';
      if (!mediaAssetId || !platformProjectId || !relativeHref) return null;
      const href = buildVideonMediaHref(relativeHref);
      if (!href) return null;
      const atMs = hitAtMs(hit);
      const title = (hit.mediaFilename?.trim() || mediaAssetId).slice(0, 256);
      const snippet = hit.searchText?.trim().slice(0, 200) || undefined;
      const timing = timingLabel(hit);
      const duration = durationLabel(hit);
      const projectName = hit.projectName?.trim() || undefined;
      return {
        id: (hit.id?.trim() || `${mediaAssetId}-${index}`).slice(0, 256),
        title,
        href,
        sceneLabel: sceneLabel(hit, index),
        ...(timing ? { timingLabel: timing } : {}),
        ...(duration ? { durationLabel: duration } : {}),
        ...(projectName ? { projectName } : {}),
        ...(snippet ? { snippet } : {}),
        posterUrl: buildVideonFramePosterUrl({
          mediaAssetId,
          platformProjectId,
          tMs: atMs,
        }),
        startMs: atMs,
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .slice(0, UI_BLOCK_LIMITS.maxVideoHits);

  if (mapped.length === 0) return [];

  const query = typeof payload.query === 'string' && payload.query.trim() ? payload.query.trim() : '';
  const created = createUiBlock(
    'video_hit_strip',
    {
      title: query ? `Szenen · ${query}` : 'Szenen',
      items: mapped,
    },
    randomUUID(),
    meta,
  );
  return created.ok ? [created.block] : [];
}
