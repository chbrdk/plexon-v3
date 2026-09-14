/**
 * Shared METRON read capability executor (agent explore).
 * @see specs/domain/capability-catalog.md — METRON set
 */

import type {
  CapabilityExecuteContext,
  CapabilityExecutor,
  CapabilityResult,
} from '@/lib/capabilities/types';
import { metronProductFetch } from '@/lib/integrations/metron-product-client';

function platformQ(input: Record<string, unknown>, ctx: CapabilityExecuteContext): string {
  const fromInput =
    typeof input.platformProjectId === 'string' ? input.platformProjectId.trim() : '';
  const id = fromInput || (ctx.platformProjectId ?? '').trim();
  return id ? `?platformProjectId=${encodeURIComponent(id)}` : '';
}

export const executeMetronRead: CapabilityExecutor = async (input, ctx) => {
  return executeMetronReadCapability(input, ctx);
};

export async function executeMetronReadCapability(
  input: Record<string, unknown>,
  ctx: CapabilityExecuteContext,
): Promise<CapabilityResult> {
  const op = typeof input.op === 'string' ? input.op.trim() : 'projects_list';
  let path = '/api/projects';
  let catalogRoot = 'metron.projects';

  switch (op) {
    case 'health':
      path = '/api/health';
      catalogRoot = 'metron.health';
      break;
    case 'datasets_list':
      path = `/api/datasets${platformQ(input, ctx)}`;
      catalogRoot = 'metron.datasets';
      break;
    case 'kpis_list':
      path = `/api/kpis${platformQ(input, ctx)}`;
      catalogRoot = 'metron.kpis';
      break;
    case 'dashboards_list':
      path = `/api/dashboards${platformQ(input, ctx)}`;
      catalogRoot = 'metron.dashboards';
      break;
    case 'dashboard_get':
    case 'dashboard_summarize': {
      const id = typeof input.id === 'string' ? input.id.trim() : '';
      if (!id) return { ok: false, error: 'id fehlt', catalogRoot: 'metron.dashboards' };
      path = `/api/dashboards/${encodeURIComponent(id)}`;
      catalogRoot = 'metron.dashboards';
      break;
    }
    default:
      path = '/api/projects';
      catalogRoot = 'metron.projects';
  }

  const res = await metronProductFetch({
    path,
    actorUserId: ctx.actorUserId,
  });
  if (!res.ok) {
    return { ok: false, error: res.error, catalogRoot, agentPayload: res.data };
  }
  return {
    ok: true,
    catalogRoot,
    catalogBundle: { status: 'ok', op },
    agentPayload: res.data,
  };
}
