import { randomUUID } from 'crypto';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from './index';
import { collectionFlowRuns, collectionTestFlows } from './schema';
import type { CollectionFlowLastRun, CollectionVerdict } from '@/lib/collection-test-flow';

export type CollectionFlowRunRow = typeof collectionFlowRuns.$inferSelect;

export type CollectionFlowRunTrigger = 'webhook' | 'service' | 'ui';
export type CollectionFlowRunStatus = 'queued' | 'running' | 'complete' | 'error';

export type CollectionFlowRunResponse = {
  id: string;
  flowId: string;
  platformProjectId: string;
  status: CollectionFlowRunStatus;
  trigger: CollectionFlowRunTrigger;
  request: Record<string, unknown> | null;
  verdict: CollectionVerdict | null;
  lastRun: CollectionFlowLastRun | null;
  callbackUrl: string | null;
  callbackStatus: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toCollectionFlowRunResponse(row: CollectionFlowRunRow): CollectionFlowRunResponse {
  return {
    id: row.id,
    flowId: row.flowId,
    platformProjectId: row.platformProjectId,
    status: row.status as CollectionFlowRunStatus,
    trigger: row.trigger as CollectionFlowRunTrigger,
    request: (row.request as Record<string, unknown> | null) ?? null,
    verdict: (row.verdict as CollectionVerdict | null) ?? null,
    lastRun: (row.lastRun as CollectionFlowLastRun | null) ?? null,
    callbackUrl: row.callbackUrl,
    callbackStatus: row.callbackStatus,
    error: row.error,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Closed subset of UI Testen / journey body stored on the run row (Wave 17). */
export function closedUiRunRequest(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof body.phase === 'string' && body.phase.trim()) out.phase = body.phase.trim();
  if (typeof body.url === 'string' && body.url.trim()) out.url = body.url.trim();
  if (typeof body.companyName === 'string' && body.companyName.trim()) {
    out.companyName = body.companyName.trim();
  }
  if (typeof body.personaNodeId === 'string' && body.personaNodeId.trim()) {
    out.personaNodeId = body.personaNodeId.trim();
  }
  if (typeof body.historyRunId === 'string' && body.historyRunId.trim()) {
    out.historyRunId = body.historyRunId.trim();
  }
  if (typeof body.audionJobId === 'string' && body.audionJobId.trim()) {
    out.audionJobId = body.audionJobId.trim();
  }
  return out;
}

export async function createCollectionFlowRun(input: {
  flowId: string;
  platformProjectId: string;
  trigger: CollectionFlowRunTrigger;
  request?: Record<string, unknown> | null;
  callbackUrl?: string | null;
  /** Default `queued` (webhook). UI Testen uses `running`. */
  status?: CollectionFlowRunStatus;
}): Promise<CollectionFlowRunRow> {
  const db = getDb();
  const id = randomUUID();
  const now = new Date();
  await db.insert(collectionFlowRuns).values({
    id,
    flowId: input.flowId,
    platformProjectId: input.platformProjectId,
    status: input.status ?? 'queued',
    trigger: input.trigger,
    request: input.request ?? null,
    callbackUrl: input.callbackUrl ?? null,
    createdAt: now,
    updatedAt: now,
  });
  const row = await getCollectionFlowRun(input.platformProjectId, input.flowId, id);
  if (!row) throw new Error('Failed to load flow run after create');
  return row;
}

export async function getCollectionFlowRun(
  platformProjectId: string,
  flowId: string,
  runId: string
): Promise<CollectionFlowRunRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(collectionFlowRuns)
    .where(
      and(
        eq(collectionFlowRuns.platformProjectId, platformProjectId),
        eq(collectionFlowRuns.flowId, flowId),
        eq(collectionFlowRuns.id, runId)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function listRecentCollectionFlowRuns(
  platformProjectId: string,
  flowId: string,
  limit = 5
): Promise<CollectionFlowRunRow[]> {
  const db = getDb();
  return db
    .select()
    .from(collectionFlowRuns)
    .where(
      and(
        eq(collectionFlowRuns.platformProjectId, platformProjectId),
        eq(collectionFlowRuns.flowId, flowId)
      )
    )
    .orderBy(desc(collectionFlowRuns.createdAt))
    .limit(limit);
}

export async function patchCollectionFlowRun(input: {
  runId: string;
  status?: CollectionFlowRunStatus;
  verdict?: CollectionVerdict | null;
  lastRun?: CollectionFlowLastRun | null;
  error?: string | null;
  callbackStatus?: string | null;
  request?: Record<string, unknown> | null;
}): Promise<CollectionFlowRunRow | null> {
  const db = getDb();
  const now = new Date();
  const patch: Record<string, unknown> = { updatedAt: now };
  if (input.status != null) patch.status = input.status;
  if (input.verdict !== undefined) patch.verdict = input.verdict as unknown as Record<string, unknown>;
  if (input.lastRun !== undefined) patch.lastRun = input.lastRun as unknown as Record<string, unknown>;
  if (input.error !== undefined) patch.error = input.error;
  if (input.callbackStatus !== undefined) patch.callbackStatus = input.callbackStatus;
  if (input.request !== undefined) patch.request = input.request;
  await db.update(collectionFlowRuns).set(patch).where(eq(collectionFlowRuns.id, input.runId));
  const [row] = await db
    .select()
    .from(collectionFlowRuns)
    .where(eq(collectionFlowRuns.id, input.runId))
    .limit(1);
  return row ?? null;
}

export async function patchFlowWebhookSettings(input: {
  platformProjectId: string;
  flowId: string;
  webhookEnabled?: boolean;
  webhookSecretHash?: string | null;
  webhookSecretHint?: string | null;
}): Promise<typeof collectionTestFlows.$inferSelect | null> {
  const db = getDb();
  const now = new Date();
  const patch: Record<string, unknown> = { updatedAt: now };
  if (input.webhookEnabled != null) patch.webhookEnabled = input.webhookEnabled;
  if (input.webhookSecretHash !== undefined) patch.webhookSecretHash = input.webhookSecretHash;
  if (input.webhookSecretHint !== undefined) patch.webhookSecretHint = input.webhookSecretHint;
  await db
    .update(collectionTestFlows)
    .set(patch)
    .where(
      and(
        eq(collectionTestFlows.platformProjectId, input.platformProjectId),
        eq(collectionTestFlows.id, input.flowId)
      )
    );
  const [row] = await db
    .select()
    .from(collectionTestFlows)
    .where(
      and(
        eq(collectionTestFlows.platformProjectId, input.platformProjectId),
        eq(collectionTestFlows.id, input.flowId)
      )
    )
    .limit(1);
  return row ?? null;
}
