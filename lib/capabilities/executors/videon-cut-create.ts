/**
 * Shared `videon.cut.create` capability executor — multi-source scenes supported.
 * @see specs/domain/capability-catalog.md — VIDEON set
 */

import type {
  CapabilityExecuteContext,
  CapabilityExecutor,
  CapabilityResult,
} from '@/lib/capabilities/types';
import { cutCreate } from '@/lib/integrations/videon-product-client';

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

function pickMediaAssetId(input: Record<string, unknown>, ctx: CapabilityExecuteContext): string {
  return (
    (typeof input.mediaAssetId === 'string' ? input.mediaAssetId : null)?.trim() ||
    (ctx.videonMediaAssetId ?? '').trim()
  );
}

export const executeVideonCutCreate: CapabilityExecutor = async (input, ctx) => {
  return executeVideonCutCreateCapability(input, ctx);
};

export async function executeVideonCutCreateCapability(
  input: Record<string, unknown>,
  ctx: CapabilityExecuteContext
): Promise<CapabilityResult> {
  const platformProjectId =
    (typeof input.platformProjectId === 'string' ? input.platformProjectId : null)?.trim() ||
    (ctx.platformProjectId ?? '').trim();
  const mediaAssetId = pickMediaAssetId(input, ctx);
  const scenes = Array.isArray(input.scenes) ? input.scenes : undefined;
  const name =
    (typeof input.name === 'string' ? input.name : null)?.trim() ||
    (typeof input.label === 'string' ? input.label : null)?.trim() ||
    'Cut';
  if (!platformProjectId) {
    return { ok: false, error: 'platformProjectId fehlt', catalogRoot: 'media.cut' };
  }
  if (!mediaAssetId && !(scenes && scenes.length > 0)) {
    return { ok: false, error: 'mediaAssetId oder scenes fehlen', catalogRoot: 'media.cut' };
  }

  const res = await cutCreate({
    platformProjectId,
    ...(mediaAssetId ? { mediaAssetId } : {}),
    name,
    actorUserId: ctx.actorUserId,
    startMs: typeof input.startMs === 'number' ? input.startMs : undefined,
    endMs: typeof input.endMs === 'number' ? input.endMs : undefined,
    scenes,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: res.error,
      catalogRoot: 'media.cut',
      catalogBundle: {
        status: 'failed',
        cutId: null,
        mediaAssetId: mediaAssetId || null,
        name,
        platformProjectId,
      },
      agentPayload: res.data,
    };
  }

  const row = asRecord(res.data);
  const cut = asRecord(row.cut);
  const cutId =
    (typeof cut.id === 'string' ? cut.id : null) ||
    (typeof row.cutId === 'string' ? row.cutId : null) ||
    (typeof row.id === 'string' ? row.id : null);
  const status =
    (typeof cut.status === 'string' ? cut.status : null) ||
    (typeof row.status === 'string' ? row.status : null) ||
    'created';

  return {
    ok: true,
    catalogRoot: 'media.cut',
    catalogBundle: {
      status,
      cutId,
      mediaAssetId: mediaAssetId || null,
      name: (typeof cut.name === 'string' ? cut.name : null) || name,
      platformProjectId,
      sceneCount: Array.isArray(row.scenes) ? row.scenes.length : null,
    },
    agentPayload: res.data,
  };
}
