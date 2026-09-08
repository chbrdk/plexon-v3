/**
 * Shared `videon.reframe.run` capability executor.
 * @see specs/domain/capability-catalog.md — VIDEON set
 */

import type {
  CapabilityExecuteContext,
  CapabilityExecutor,
  CapabilityResult,
} from '@/lib/capabilities/types';
import { reframeRun } from '@/lib/integrations/videon-product-client';

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

export const executeVideonReframeRun: CapabilityExecutor = async (input, ctx) => {
  return executeVideonReframeRunCapability(input, ctx);
};

export async function executeVideonReframeRunCapability(
  input: Record<string, unknown>,
  ctx: CapabilityExecuteContext
): Promise<CapabilityResult> {
  const platformProjectId =
    (typeof input.platformProjectId === 'string' ? input.platformProjectId : null)?.trim() ||
    (ctx.platformProjectId ?? '').trim();
  const mediaAssetId = (typeof input.mediaAssetId === 'string' ? input.mediaAssetId : null)?.trim() || '';
  if (!platformProjectId) {
    return { ok: false, error: 'platformProjectId fehlt', catalogRoot: 'media.reframe' };
  }
  if (!mediaAssetId) {
    return { ok: false, error: 'mediaAssetId fehlt', catalogRoot: 'media.reframe' };
  }

  const res = await reframeRun({
    platformProjectId,
    mediaAssetId,
    actorUserId: ctx.actorUserId,
    aspectRatio: typeof input.aspectRatio === 'string' ? input.aspectRatio : undefined,
    smoothingFactor: typeof input.smoothingFactor === 'number' ? input.smoothingFactor : undefined,
    customWidth: typeof input.customWidth === 'number' ? input.customWidth : undefined,
    customHeight: typeof input.customHeight === 'number' ? input.customHeight : undefined,
    idempotencyKey: typeof input.idempotencyKey === 'string' ? input.idempotencyKey : undefined,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: res.error,
      catalogRoot: 'media.reframe',
      catalogBundle: {
        status: 'failed',
        reframeId: null,
        mediaAssetId,
        platformProjectId,
      },
      agentPayload: res.data,
    };
  }

  const row = asRecord(res.data);
  const reframe = asRecord(row.reframe);
  const reframeId =
    (typeof reframe.id === 'string' ? reframe.id : null) ||
    (typeof row.reframeId === 'string' ? row.reframeId : null) ||
    (typeof row.id === 'string' ? row.id : null);
  const status =
    (typeof reframe.status === 'string' ? reframe.status : null) ||
    (typeof row.status === 'string' ? row.status : null) ||
    'queued';

  return {
    ok: true,
    catalogRoot: 'media.reframe',
    catalogBundle: {
      status,
      reframeId,
      mediaAssetId,
      platformProjectId,
      aspectRatio: reframe.aspectRatio ?? input.aspectRatio ?? '9:16',
      deepLink: reframe.deepLink ?? null,
    },
    agentPayload: res.data,
  };
}
