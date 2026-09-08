/**
 * Shared `videon.cut.scenes.add` capability executor.
 * @see specs/domain/cut-multi-source-compose.md
 */

import type {
  CapabilityExecuteContext,
  CapabilityExecutor,
  CapabilityResult,
} from '@/lib/capabilities/types';
import { cutScenesAdd } from '@/lib/integrations/videon-product-client';

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

export const executeVideonCutScenesAdd: CapabilityExecutor = async (input, ctx) => {
  return executeVideonCutScenesAddCapability(input, ctx);
};

export async function executeVideonCutScenesAddCapability(
  input: Record<string, unknown>,
  ctx: CapabilityExecuteContext
): Promise<CapabilityResult> {
  const platformProjectId =
    (typeof input.platformProjectId === 'string' ? input.platformProjectId : null)?.trim() ||
    (ctx.platformProjectId ?? '').trim();
  const cutId = (typeof input.cutId === 'string' ? input.cutId : null)?.trim() || '';
  const scenes = Array.isArray(input.scenes) ? input.scenes : [];
  if (!platformProjectId) {
    return { ok: false, error: 'platformProjectId fehlt', catalogRoot: 'media.cut' };
  }
  if (!cutId) {
    return { ok: false, error: 'cutId fehlt', catalogRoot: 'media.cut' };
  }
  if (!scenes.length) {
    return { ok: false, error: 'scenes fehlen', catalogRoot: 'media.cut' };
  }

  const res = await cutScenesAdd({
    platformProjectId,
    cutId,
    actorUserId: ctx.actorUserId,
    afterSceneId: typeof input.afterSceneId === 'string' ? input.afterSceneId : undefined,
    scenes,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: res.error,
      catalogRoot: 'media.cut',
      catalogBundle: {
        status: 'failed',
        cutId,
        platformProjectId,
      },
      agentPayload: res.data,
    };
  }

  const row = asRecord(res.data);
  const sceneList = Array.isArray(row.scenes) ? row.scenes : [];

  return {
    ok: true,
    catalogRoot: 'media.cut',
    catalogBundle: {
      status: 'updated',
      cutId,
      platformProjectId,
      sceneCount: sceneList.length,
    },
    agentPayload: res.data,
  };
}
