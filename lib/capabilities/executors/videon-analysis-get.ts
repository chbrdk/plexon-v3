/**
 * Shared `videon.analysis.get` capability executor.
 * @see specs/domain/capability-catalog.md — VIDEON set (V6)
 */

import type {
  CapabilityExecuteContext,
  CapabilityExecutor,
  CapabilityResult,
} from '@/lib/capabilities/types';
import { analysisGet, mediaGet } from '@/lib/integrations/videon-product-client';

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

export const executeVideonAnalysisGet: CapabilityExecutor = async (input, ctx) => {
  return executeVideonAnalysisGetCapability(input, ctx);
};

export async function executeVideonAnalysisGetCapability(
  input: Record<string, unknown>,
  ctx: CapabilityExecuteContext
): Promise<CapabilityResult> {
  const platformProjectId =
    (typeof input.platformProjectId === 'string' ? input.platformProjectId : null)?.trim() ||
    (ctx.platformProjectId ?? '').trim();
  const mediaAssetId = pickMediaAssetId(input, ctx);
  if (!platformProjectId) {
    return { ok: false, error: 'platformProjectId fehlt', catalogRoot: 'media.analysis' };
  }
  if (!mediaAssetId) {
    return { ok: false, error: 'mediaAssetId fehlt', catalogRoot: 'media.analysis' };
  }

  const preferMedia = input.preferMediaGet === true;
  const res = preferMedia
    ? await mediaGet({
        platformProjectId,
        mediaAssetId,
        actorUserId: ctx.actorUserId,
      })
    : await analysisGet({
        platformProjectId,
        mediaAssetId,
        actorUserId: ctx.actorUserId,
      });

  // Fallback: some environments only expose analysis via media get payload.
  const final =
    res.ok || preferMedia
      ? res
      : await mediaGet({
          platformProjectId,
          mediaAssetId,
          actorUserId: ctx.actorUserId,
        });

  if (!final.ok) {
    return {
      ok: false,
      error: final.error,
      catalogRoot: 'media.analysis',
      catalogBundle: {
        status: 'failed',
        mediaAssetId,
        analysisRunId: null,
        platformProjectId,
      },
      agentPayload: final.data,
    };
  }

  const row = asRecord(final.data);
  const analysis = asRecord(row.analysis);
  const analysisRunId =
    (typeof analysis.id === 'string' ? analysis.id : null) ||
    (typeof row.analysisRunId === 'string' ? row.analysisRunId : null) ||
    (typeof row.id === 'string' && preferMedia === false ? row.id : null);
  const status =
    (typeof analysis.status === 'string' ? analysis.status : null) ||
    (typeof row.status === 'string' ? row.status : null) ||
    (typeof row.lifecycleState === 'string' ? row.lifecycleState : null) ||
    'ok';

  return {
    ok: true,
    catalogRoot: 'media.analysis',
    catalogBundle: {
      status,
      mediaAssetId,
      analysisRunId,
      platformProjectId,
    },
    agentPayload: final.data,
  };
}
