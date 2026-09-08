/**
 * Shared `videon.export.run` capability executor.
 * @see specs/domain/capability-catalog.md — VIDEON set (V6)
 */

import type {
  CapabilityExecuteContext,
  CapabilityExecutor,
  CapabilityResult,
} from '@/lib/capabilities/types';
import { exportRun } from '@/lib/integrations/videon-product-client';

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

export const executeVideonExportRun: CapabilityExecutor = async (input, ctx) => {
  return executeVideonExportRunCapability(input, ctx);
};

export async function executeVideonExportRunCapability(
  input: Record<string, unknown>,
  ctx: CapabilityExecuteContext
): Promise<CapabilityResult> {
  const platformProjectId =
    (typeof input.platformProjectId === 'string' ? input.platformProjectId : null)?.trim() ||
    (ctx.platformProjectId ?? '').trim();
  const cutId = (typeof input.cutId === 'string' ? input.cutId : null)?.trim() || '';
  if (!platformProjectId) {
    return { ok: false, error: 'platformProjectId fehlt', catalogRoot: 'media.export' };
  }
  if (!cutId) {
    return { ok: false, error: 'cutId fehlt', catalogRoot: 'media.export' };
  }

  const res = await exportRun({
    platformProjectId,
    cutId,
    actorUserId: ctx.actorUserId,
    idempotencyKey:
      typeof input.idempotencyKey === 'string' ? input.idempotencyKey : undefined,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: res.error,
      catalogRoot: 'media.export',
      catalogBundle: {
        status: 'failed',
        exportId: null,
        cutId,
        platformProjectId,
      },
      agentPayload: res.data,
    };
  }

  const row = asRecord(res.data);
  const exportJob = asRecord(row.export ?? row.exportJob);
  const exportId =
    (typeof exportJob.id === 'string' ? exportJob.id : null) ||
    (typeof row.exportId === 'string' ? row.exportId : null) ||
    (typeof row.id === 'string' ? row.id : null);
  const status =
    (typeof exportJob.status === 'string' ? exportJob.status : null) ||
    (typeof row.status === 'string' ? row.status : null) ||
    'queued';

  return {
    ok: true,
    catalogRoot: 'media.export',
    catalogBundle: {
      status,
      exportId,
      cutId,
      platformProjectId,
    },
    agentPayload: res.data,
  };
}
