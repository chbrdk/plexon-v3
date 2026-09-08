/**
 * Thin Plexon → VIDEON product HTTP helper (service secret + actor + contract).
 * Paths align with VIDEON media / cuts APIs used by MCP.
 * @see knowledge/collection-flow-videon.md
 */

import { getVideonUrl } from '@/lib/constants';
import {
  PLEXON_CONTRACT_VERSION_HEADER,
  PLEXON_FEDERATION_CONTRACT_VERSION,
  PLEXON_SERVICE_SECRET_HEADER,
} from '@/lib/platform-contract';

const PLEXON_USER_HEADER = 'X-Plexon-User-Id';

export type VideonProductResult =
  | { ok: true; status: number; data: unknown }
  | { ok: false; status: number; error: string; data?: unknown };

function requireAuth():
  | { ok: true; base: string; headers: Record<string, string> }
  | { ok: false; error: string; status: number } {
  const base = getVideonUrl()?.replace(/\/+$/, '') ?? '';
  const secret = process.env.PLEXON_SERVICE_SECRET?.trim() ?? '';
  if (!base) return { ok: false, error: 'VIDEON URL missing on PLEXON', status: 503 };
  if (!secret) return { ok: false, error: 'PLEXON_SERVICE_SECRET missing on PLEXON', status: 503 };
  return {
    ok: true,
    base,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      [PLEXON_SERVICE_SECRET_HEADER]: secret,
      [PLEXON_CONTRACT_VERSION_HEADER]: PLEXON_FEDERATION_CONTRACT_VERSION,
    },
  };
}

function withActor(
  headers: Record<string, string>,
  actorUserId?: string | null
): Record<string, string> {
  const next = { ...headers };
  if (actorUserId?.trim()) next[PLEXON_USER_HEADER] = actorUserId.trim();
  return next;
}

function platformQuery(platformProjectId: string): string {
  return `platformProjectId=${encodeURIComponent(platformProjectId.trim())}`;
}

async function videonFetch(input: {
  method: 'GET' | 'POST';
  path: string;
  actorUserId?: string | null;
  body?: unknown;
}): Promise<VideonProductResult> {
  const auth = requireAuth();
  if (!auth.ok) return { ok: false, status: auth.status, error: auth.error };

  try {
    const res = await fetch(`${auth.base}${input.path}`, {
      method: input.method,
      headers: withActor(auth.headers, input.actorUserId),
      body: input.method === 'POST' ? JSON.stringify(input.body ?? {}) : undefined,
      cache: 'no-store',
    });
    const text = await res.text().catch(() => '');
    let data: unknown = null;
    if (text.trim()) {
      try {
        data = JSON.parse(text) as unknown;
      } catch {
        data = { raw: text.slice(0, 500) };
      }
    }
    if (!res.ok) {
      const err =
        data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string'
          ? (data as { error: string }).error
          : text.slice(0, 200) || `HTTP ${res.status}`;
      return { ok: false, status: res.status, error: err, data };
    }
    return { ok: true, status: res.status, data };
  } catch (e) {
    return {
      ok: false,
      status: 502,
      error: e instanceof Error ? e.message : 'videon_request_failed',
    };
  }
}

export async function mediaSearch(input: {
  platformProjectId: string;
  query: string;
  actorUserId?: string | null;
}): Promise<VideonProductResult> {
  const q = input.query.trim();
  if (!q) return { ok: false, status: 400, error: 'query required' };
  const pid = input.platformProjectId.trim();
  if (!pid) return { ok: false, status: 400, error: 'platformProjectId required' };
  return videonFetch({
    method: 'GET',
    path: `/api/media/search?${platformQuery(pid)}&q=${encodeURIComponent(q)}`,
    actorUserId: input.actorUserId,
  });
}

export async function mediaGet(input: {
  platformProjectId: string;
  mediaAssetId: string;
  actorUserId?: string | null;
}): Promise<VideonProductResult> {
  const pid = input.platformProjectId.trim();
  const mid = input.mediaAssetId.trim();
  if (!pid) return { ok: false, status: 400, error: 'platformProjectId required' };
  if (!mid) return { ok: false, status: 400, error: 'mediaAssetId required' };
  return videonFetch({
    method: 'GET',
    path: `/api/media/${encodeURIComponent(mid)}?${platformQuery(pid)}`,
    actorUserId: input.actorUserId,
  });
}

export async function analysisGet(input: {
  platformProjectId: string;
  mediaAssetId: string;
  actorUserId?: string | null;
}): Promise<VideonProductResult> {
  const pid = input.platformProjectId.trim();
  const mid = input.mediaAssetId.trim();
  if (!pid) return { ok: false, status: 400, error: 'platformProjectId required' };
  if (!mid) return { ok: false, status: 400, error: 'mediaAssetId required' };
  return videonFetch({
    method: 'GET',
    path: `/api/media/${encodeURIComponent(mid)}/analysis?${platformQuery(pid)}`,
    actorUserId: input.actorUserId,
  });
}

export async function analysisRun(input: {
  platformProjectId: string;
  mediaAssetId: string;
  actorUserId?: string | null;
  body?: Record<string, unknown>;
}): Promise<VideonProductResult> {
  const pid = input.platformProjectId.trim();
  const mid = input.mediaAssetId.trim();
  if (!pid) return { ok: false, status: 400, error: 'platformProjectId required' };
  if (!mid) return { ok: false, status: 400, error: 'mediaAssetId required' };
  return videonFetch({
    method: 'POST',
    path: `/api/media/${encodeURIComponent(mid)}/analysis?${platformQuery(pid)}`,
    actorUserId: input.actorUserId,
    body: input.body ?? {},
  });
}

export async function cutCreate(input: {
  platformProjectId: string;
  mediaAssetId?: string;
  name: string;
  actorUserId?: string | null;
  startMs?: number;
  endMs?: number;
  scenes?: unknown[];
}): Promise<VideonProductResult> {
  const pid = input.platformProjectId.trim();
  const mid = input.mediaAssetId?.trim() || '';
  const name = input.name.trim();
  if (!pid) return { ok: false, status: 400, error: 'platformProjectId required' };
  if (!name) return { ok: false, status: 400, error: 'name required' };
  if (!mid && !(Array.isArray(input.scenes) && input.scenes.length > 0)) {
    return { ok: false, status: 400, error: 'mediaAssetId or scenes required' };
  }
  return videonFetch({
    method: 'POST',
    path: '/api/cuts',
    actorUserId: input.actorUserId,
    body: {
      platformProjectId: pid,
      name,
      ...(mid ? { mediaAssetId: mid } : {}),
      ...(typeof input.startMs === 'number' ? { startMs: input.startMs } : {}),
      ...(typeof input.endMs === 'number' ? { endMs: input.endMs } : {}),
      ...(input.scenes ? { scenes: input.scenes } : {}),
    },
  });
}

export async function cutScenesAdd(input: {
  platformProjectId: string;
  cutId: string;
  actorUserId?: string | null;
  afterSceneId?: string;
  scenes: unknown[];
}): Promise<VideonProductResult> {
  const pid = input.platformProjectId.trim();
  const cutId = input.cutId.trim();
  if (!pid) return { ok: false, status: 400, error: 'platformProjectId required' };
  if (!cutId) return { ok: false, status: 400, error: 'cutId required' };
  if (!Array.isArray(input.scenes) || input.scenes.length === 0) {
    return { ok: false, status: 400, error: 'scenes required' };
  }
  return videonFetch({
    method: 'PATCH',
    path: `/api/cuts/${encodeURIComponent(cutId)}?${platformQuery(pid)}`,
    actorUserId: input.actorUserId,
    body: {
      action: 'addScenes',
      scenes: input.scenes,
      ...(input.afterSceneId?.trim() ? { afterSceneId: input.afterSceneId.trim() } : {}),
    },
  });
}

export async function exportRun(input: {
  platformProjectId: string;
  cutId: string;
  actorUserId?: string | null;
  format?: 'mp4' | 'premiere_xml';
  idempotencyKey?: string;
}): Promise<VideonProductResult> {
  const pid = input.platformProjectId.trim();
  const cutId = input.cutId.trim();
  if (!pid) return { ok: false, status: 400, error: 'platformProjectId required' };
  if (!cutId) return { ok: false, status: 400, error: 'cutId required' };
  const body: Record<string, unknown> = {};
  if (input.format) body.format = input.format;
  if (input.idempotencyKey?.trim()) body.idempotencyKey = input.idempotencyKey.trim();
  return videonFetch({
    method: 'POST',
    path: `/api/cuts/${encodeURIComponent(cutId)}/exports?${platformQuery(pid)}`,
    actorUserId: input.actorUserId,
    body,
  });
}

export async function reframeRun(input: {
  platformProjectId: string;
  mediaAssetId: string;
  actorUserId?: string | null;
  aspectRatio?: string;
  smoothingFactor?: number;
  customWidth?: number;
  customHeight?: number;
  idempotencyKey?: string;
}): Promise<VideonProductResult> {
  const pid = input.platformProjectId.trim();
  const mid = input.mediaAssetId.trim();
  if (!pid) return { ok: false, status: 400, error: 'platformProjectId required' };
  if (!mid) return { ok: false, status: 400, error: 'mediaAssetId required' };
  return videonFetch({
    method: 'POST',
    path: `/api/media/${encodeURIComponent(mid)}/reframe?${platformQuery(pid)}`,
    actorUserId: input.actorUserId,
    body: {
      aspectRatio: input.aspectRatio ?? '9:16',
      saliencyModel: 'robust_v1',
      ...(typeof input.smoothingFactor === 'number' ? { smoothingFactor: input.smoothingFactor } : {}),
      ...(typeof input.customWidth === 'number' ? { customWidth: input.customWidth } : {}),
      ...(typeof input.customHeight === 'number' ? { customHeight: input.customHeight } : {}),
      ...(input.idempotencyKey?.trim() ? { idempotencyKey: input.idempotencyKey.trim() } : {}),
    },
  });
}
