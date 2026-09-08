/**
 * Shared `videon.analysis.run` capability executor.
 * @see specs/domain/capability-catalog.md — VIDEON set (V6)
 */

import type {
  CapabilityExecuteContext,
  CapabilityExecutor,
  CapabilityResult,
} from '@/lib/capabilities/types';
import { analysisRun } from '@/lib/integrations/videon-product-client';

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

export const executeVideonAnalysisRun: CapabilityExecutor = async (input, ctx) => {
  return executeVideonAnalysisRunCapability(input, ctx);
};

export async function executeVideonAnalysisRunCapability(
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

  const body =
    input.body && typeof input.body === 'object' && !Array.isArray(input.body)
      ? (input.body as Record<string, unknown>)
      : {};

  const res = await analysisRun({
    platformProjectId,
    mediaAssetId,
    actorUserId: ctx.actorUserId,
    body,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: res.error,
      catalogRoot: 'media.analysis',
      catalogBundle: {
        status: 'failed',
        mediaAssetId,
        analysisRunId: null,
        platformProjectId,
      },
      agentPayload: res.data,
    };
  }

  const row = asRecord(res.data);
  const analysis = asRecord(row.analysis);
  const analysisRunId =
    (typeof analysis.id === 'string' ? analysis.id : null) ||
    (typeof row.analysisRunId === 'string' ? row.analysisRunId : null) ||
    (typeof row.id === 'string' ? row.id : null);
  const status =
    (typeof analysis.status === 'string' ? analysis.status : null) ||
    (typeof row.status === 'string' ? row.status : null) ||
    'queued';

  return {
    ok: true,
    catalogRoot: 'media.analysis',
    catalogBundle: {
      status,
      mediaAssetId,
      analysisRunId,
      platformProjectId,
    },
    agentPayload: res.data,
  };
}
