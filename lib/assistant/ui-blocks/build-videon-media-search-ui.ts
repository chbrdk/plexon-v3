import { randomUUID } from 'crypto';
import type { UiBlock } from '@/lib/assistant/ui-blocks/types';
import { UI_BLOCK_LIMITS } from '@/lib/assistant/ui-blocks/types';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';
import {
  buildVideonFramePosterUrl,
  buildVideonMediaHref,
  buildVideonPreviewUrl,
} from '@/lib/assistant/ui-blocks/product-links';
import {
  sceneHitAtMs,
  sceneHitDurationLabel,
  sceneHitOrdinalLabel,
  sceneHitTimingLabel,
} from '@/lib/assistant/ui-blocks/scene-hit-model';

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

const DEFAULT_HIT_ACTIONS = [
  { id: 'open', label: 'Öffnen', kind: 'open' as const },
  { id: 'analysis_run', label: 'Analyse', kind: 'analysis_run' as const },
  { id: 'brand_check_run', label: 'Brand-Check', kind: 'brand_check_run' as const },
  { id: 'cut_create', label: 'Cut', kind: 'cut_create' as const },
];

/**
 * Build video_hit_strip from VIDEON MCP media_search payload.
 * Spec: assistant-videon-mcp.md · scene-hit-model.md
 */
export function buildVideonMediaSearchBlocks(
  payload: VideonMediaSearchPayload,
  meta?: UiBlock['meta'],
): UiBlock[] {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const byMedia = new Map<string, VideonMediaSearchHit[]>();
  for (const hit of items) {
    const id = hit.mediaAssetId?.trim() ?? '';
    if (!id) continue;
    const list = byMedia.get(id) ?? [];
    list.push(hit);
    byMedia.set(id, list);
  }

  const mapped = items
    .map((hit, index) => {
      const mediaAssetId = hit.mediaAssetId?.trim() ?? '';
      const platformProjectId = hit.platformProjectId?.trim() ?? '';
      const relativeHref = hit.href?.trim() ?? '';
      if (!mediaAssetId || !platformProjectId || !relativeHref) return null;
      const href = buildVideonMediaHref(relativeHref);
      if (!href) return null;
      const atMs = sceneHitAtMs(hit);
      const title = (hit.mediaFilename?.trim() || mediaAssetId).slice(0, 256);
      const snippet = hit.searchText?.trim().slice(0, 200) || undefined;
      const timing = sceneHitTimingLabel(hit);
      const duration = sceneHitDurationLabel(hit);
      const projectName = hit.projectName?.trim() || undefined;
      const siblings = (byMedia.get(mediaAssetId) ?? [])
        .slice(0, 8)
        .map((sib) => {
          const tMs = sceneHitAtMs(sib);
          return {
            tMs,
            sceneKey: sib.sceneKey?.trim() || undefined,
            posterUrl: buildVideonFramePosterUrl({
              mediaAssetId,
              platformProjectId,
              tMs,
            }),
          };
        });
      return {
        id: (hit.id?.trim() || `${mediaAssetId}-${index}`).slice(0, 256),
        title,
        href,
        mediaAssetId,
        platformProjectId,
        sceneLabel: sceneHitOrdinalLabel(hit, index),
        ...(timing ? { timingLabel: timing } : {}),
        ...(duration ? { durationLabel: duration } : {}),
        ...(projectName ? { projectName } : {}),
        ...(snippet ? { snippet } : {}),
        posterUrl: buildVideonFramePosterUrl({
          mediaAssetId,
          platformProjectId,
          tMs: atMs,
        }),
        previewUrl: buildVideonPreviewUrl({
          mediaAssetId,
          platformProjectId,
          tMs: atMs,
        }),
        startMs: atMs,
        ...(siblings.length > 1 ? { filmstrip: siblings } : {}),
        actions: DEFAULT_HIT_ACTIONS,
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
