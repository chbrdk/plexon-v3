/**
 * Shared `videon.generate.create` capability executor.
 * @see specs/domain/capability-catalog.md — VIDEON set
 */

import type {
  CapabilityExecuteContext,
  CapabilityExecutor,
  CapabilityResult,
} from '@/lib/capabilities/types';
import { generateCreateRun } from '@/lib/integrations/videon-product-client';

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

export const executeVideonGenerateCreateRun: CapabilityExecutor = async (input, ctx) => {
  return executeVideonGenerateCreateRunCapability(input, ctx);
};

export async function executeVideonGenerateCreateRunCapability(
  input: Record<string, unknown>,
  ctx: CapabilityExecuteContext
): Promise<CapabilityResult> {
  const platformProjectId =
    (typeof input.platformProjectId === 'string' ? input.platformProjectId : null)?.trim() ||
    (ctx.platformProjectId ?? '').trim();
  const prompt = (typeof input.prompt === 'string' ? input.prompt : null)?.trim() || '';

  if (!platformProjectId) {
    return { ok: false, error: 'platformProjectId fehlt', catalogRoot: 'media.generate' };
  }
  if (!prompt) {
    return { ok: false, error: 'prompt fehlt', catalogRoot: 'media.generate' };
  }

  const res = await generateCreateRun({
    platformProjectId,
    actorUserId: ctx.actorUserId,
    prompt,
    modelId: typeof input.modelId === 'string' ? input.modelId : undefined,
    durationSeconds: typeof input.durationSeconds === 'number' ? input.durationSeconds : undefined,
    aspectRatio: typeof input.aspectRatio === 'string' ? input.aspectRatio : undefined,
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
      platformProjectId,
      intent: 'create',
      deepLink: job.deepLink ?? null,
    },
    agentPayload: res.data,
  };
}
