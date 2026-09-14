/**
 * Shared METRON write capability executor (chat confirm).
 * @see specs/domain/capability-catalog.md — METRON set
 */

import type {
  CapabilityExecuteContext,
  CapabilityExecutor,
  CapabilityResult,
} from '@/lib/capabilities/types';
import { metronProductFetch } from '@/lib/integrations/metron-product-client';

export const executeMetronWrite: CapabilityExecutor = async (input, ctx) => {
  return executeMetronWriteCapability(input, ctx);
};

export async function executeMetronWriteCapability(
  input: Record<string, unknown>,
  ctx: CapabilityExecuteContext,
): Promise<CapabilityResult> {
  const op = typeof input.op === 'string' ? input.op.trim() : '';
  const platformProjectId =
    (typeof input.platformProjectId === 'string' ? input.platformProjectId : null)?.trim() ||
    (ctx.platformProjectId ?? '').trim();

  if (op === 'dashboard_create') {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!platformProjectId || !name) {
      return { ok: false, error: 'platformProjectId und name erforderlich', catalogRoot: 'metron.dashboards' };
    }
    const res = await metronProductFetch({
      path: '/api/dashboards',
      method: 'POST',
      body: {
        platformProjectId,
        name,
        description: typeof input.description === 'string' ? input.description : undefined,
        templateId: typeof input.templateId === 'string' ? input.templateId : undefined,
        kpiIds: Array.isArray(input.kpiIds) ? input.kpiIds : undefined,
      },
      actorUserId: ctx.actorUserId,
    });
    if (!res.ok) return { ok: false, error: res.error, catalogRoot: 'metron.dashboards', agentPayload: res.data };
    return { ok: true, catalogRoot: 'metron.dashboards', catalogBundle: { status: 'created' }, agentPayload: res.data };
  }

  if (op === 'kpi_starter_pack_install') {
    if (!platformProjectId) {
      return { ok: false, error: 'platformProjectId fehlt', catalogRoot: 'metron.kpis' };
    }
    const res = await metronProductFetch({
      path: '/api/kpis/starter-pack',
      method: 'POST',
      body: {
        platformProjectId,
        packId: typeof input.packId === 'string' ? input.packId : 'hdi-recruiting',
      },
      actorUserId: ctx.actorUserId,
    });
    if (!res.ok) return { ok: false, error: res.error, catalogRoot: 'metron.kpis', agentPayload: res.data };
    return { ok: true, catalogRoot: 'metron.kpis', catalogBundle: { status: 'installed' }, agentPayload: res.data };
  }

  if (op === 'suite_connectors_sync') {
    const kind = typeof input.kind === 'string' ? input.kind.trim() : '';
    if (!platformProjectId || !kind) {
      return { ok: false, error: 'platformProjectId und kind erforderlich', catalogRoot: 'metron.suite' };
    }
    const res = await metronProductFetch({
      path: '/api/suite-connectors/sync',
      method: 'POST',
      body: { platformProjectId, kind },
      actorUserId: ctx.actorUserId,
    });
    if (!res.ok) return { ok: false, error: res.error, catalogRoot: 'metron.suite', agentPayload: res.data };
    return { ok: true, catalogRoot: 'metron.suite', catalogBundle: { status: 'synced', kind }, agentPayload: res.data };
  }

  return { ok: false, error: `unknown metron write op: ${op || '(empty)'}` };
}
