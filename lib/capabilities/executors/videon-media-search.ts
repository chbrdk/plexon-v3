/**
 * Shared `videon.media.search` capability executor.
 * @see specs/domain/capability-catalog.md — VIDEON set (V6)
 */

import type {
  CapabilityExecuteContext,
  CapabilityExecutor,
  CapabilityResult,
} from '@/lib/capabilities/types';
import { mediaSearch } from '@/lib/integrations/videon-product-client';

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

export const executeVideonMediaSearch: CapabilityExecutor = async (input, ctx) => {
  return executeVideonMediaSearchCapability(input, ctx);
};

export async function executeVideonMediaSearchCapability(
  input: Record<string, unknown>,
  ctx: CapabilityExecuteContext
): Promise<CapabilityResult> {
  const platformProjectId =
    (typeof input.platformProjectId === 'string' ? input.platformProjectId : null)?.trim() ||
    (ctx.platformProjectId ?? '').trim();
  const query =
    (typeof input.query === 'string' ? input.query : null)?.trim() ||
    (typeof input.q === 'string' ? input.q : null)?.trim() ||
    '';
  if (!platformProjectId) {
    return { ok: false, error: 'platformProjectId fehlt', catalogRoot: 'media.search' };
  }
  if (!query) {
    return { ok: false, error: 'query fehlt', catalogRoot: 'media.search' };
  }

  const res = await mediaSearch({
    platformProjectId,
    query,
    actorUserId: ctx.actorUserId,
  });
  if (!res.ok) {
    return {
      ok: false,
      error: res.error,
      catalogRoot: 'media.search',
      agentPayload: res.data,
    };
  }

  const row = asRecord(res.data);
  const items = Array.isArray(row.items) ? row.items : [];
  return {
    ok: true,
    catalogRoot: 'media.search',
    catalogBundle: {
      status: 'ok',
      query,
      platformProjectId,
      itemCount: items.length,
      items,
    },
    agentPayload: res.data,
  };
}
