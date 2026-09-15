/**
 * Shared `videon.generate.edit` capability executor.
 * @see specs/domain/capability-catalog.md — VIDEON set
 */

import type {
  CapabilityExecuteContext,
  CapabilityExecutor,
  CapabilityResult,
} from '@/lib/capabilities/types';
import { generateEditRun } from '@/lib/integrations/videon-product-client';

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

export const executeVideonGenerateEditRun: CapabilityExecutor = async (input, ctx) => {
  return executeVideonGenerateEditRunCapability(input, ctx);
};

export async function executeVideonGenerateEditRunCapability(
  input: Record<string, unknown>,
  ctx: CapabilityExecuteContext
): Promise<CapabilityResult> {
  const platformProjectId =
    (typeof input.platformProjectId === 'string' ? input.platformProjectId : null)?.trim() ||
    (ctx.platformProjectId ?? '').trim();
  const mediaAssetId = (typeof input.mediaAssetId === 'string' ? input.mediaAssetId : null)?.trim() || '';
  const prompt = (typeof input.prompt === 'string' ? input.prompt : null)?.trim() || '';
  const startMs = typeof input.startMs === 'number' ? input.startMs : NaN;
  const endMs = typeof input.endMs === 'number' ? input.endMs : NaN;

  if (!platformProjectId) {
    return { ok: false, error: 'platformProjectId fehlt', catalogRoot: 'media.generate' };
  }
  if (!mediaAssetId) {
    return { ok: false, error: 'mediaAssetId fehlt', catalogRoot: 'media.generate' };
  }
  if (!prompt) {
    return { ok: false, error: 'prompt fehlt', catalogRoot: 'media.generate' };
  }
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return { ok: false, error: 'startMs/endMs ungültig', catalogRoot: 'media.generate' };
  }

  const res = await generateEditRun({
    platformProjectId,
    mediaAssetId,
    actorUserId: ctx.actorUserId,
    startMs: Math.floor(startMs),
    endMs: Math.floor(endMs),
    prompt,
    modelId: typeof input.modelId === 'string' ? input.modelId : undefined,
    skipDraft: input.skipDraft === true,
    keepSourceAudio: input.keepSourceAudio !== false,
    referenceImageUrls: Array.isArray(input.referenceImageUrls)
      ? input.referenceImageUrls.filter((u): u is string => typeof u === 'string')
      : undefined,
    seed: typeof input.seed === 'number' ? input.seed : undefined,
    idempotencyKey: typeof input.idempotencyKey === 'string' ? input.idempotencyKey : undefined,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: res.error,
      catalogRoot: 'media.generate',
      catalogBundle: {
        status: 'failed',
        jobId: null,
        mediaAssetId,
        platformProjectId,
      },
      agentPayload: res.data,
    };
  }

  const row = asRecord(res.data);
  const job = asRecord(row.job);
  const jobId =
    (typeof job.id === 'string' ? job.id : null) ||
    (typeof row.jobId === 'string' ? row.jobId : null) ||
    (typeof row.id === 'string' ? row.id : null);
  const status =
    (typeof job.status === 'string' ? job.status : null) ||
    (typeof row.status === 'string' ? row.status : null) ||
    'queued';

  return {
    ok: true,
    catalogRoot: 'media.generate',
    catalogBundle: {
      status,
      jobId,
      mediaAssetId,
      platformProjectId,
      intent: 'edit',
      deepLink: job.deepLink ?? null,
    },
    agentPayload: res.data,
  };
}
