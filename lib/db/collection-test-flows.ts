import { randomUUID } from 'crypto';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from './index';
import { collectionTestFlows } from './schema';
import {
  ensureFlowDocument,
  type CollectionTestFlowDocument,
  type CollectionVerdict,
  type CollectionFlowLastRun,
} from '@/lib/collection-test-flow';

export type CollectionTestFlowRow = typeof collectionTestFlows.$inferSelect;

export type CollectionTestFlowResponse = {
  id: string;
  platformProjectId: string;
  name: string;
  templateId: string | null;
  ownerId: string | null;
  flow: CollectionTestFlowDocument;
  createdAt: string;
  updatedAt: string;
};

export function toCollectionTestFlowResponse(row: CollectionTestFlowRow): CollectionTestFlowResponse {
  return {
    id: row.id,
    platformProjectId: row.platformProjectId,
    name: row.name,
    templateId: row.templateId,
    ownerId: row.ownerId,
    flow: ensureFlowDocument(row.flow),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listCollectionTestFlows(
  platformProjectId: string
): Promise<CollectionTestFlowRow[]> {
  const db = getDb();
  return db
    .select()
    .from(collectionTestFlows)
    .where(eq(collectionTestFlows.platformProjectId, platformProjectId))
    .orderBy(desc(collectionTestFlows.updatedAt));
}

export async function getCollectionTestFlow(
  platformProjectId: string,
  flowId: string
): Promise<CollectionTestFlowRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(collectionTestFlows)
    .where(
      and(
        eq(collectionTestFlows.platformProjectId, platformProjectId),
        eq(collectionTestFlows.id, flowId)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function createCollectionTestFlow(input: {
  platformProjectId: string;
  name: string;
  flow: CollectionTestFlowDocument;
  templateId?: string | null;
  ownerId?: string | null;
}): Promise<CollectionTestFlowRow> {
  const db = getDb();
  const id = randomUUID();
  const now = new Date();
  await db.insert(collectionTestFlows).values({
    id,
    platformProjectId: input.platformProjectId,
    name: input.name.trim() || 'Page quality',
    flow: input.flow as unknown as Record<string, unknown>,
    ownerId: input.ownerId ?? null,
    templateId: input.templateId ?? input.flow.templateId ?? null,
    createdAt: now,
    updatedAt: now,
  });
  const created = await getCollectionTestFlow(input.platformProjectId, id);
  if (!created) throw new Error('Failed to load flow after create');
  return created;
}

export async function patchCollectionTestFlow(input: {
  platformProjectId: string;
  flowId: string;
  name?: string;
  flow?: CollectionTestFlowDocument;
}): Promise<CollectionTestFlowRow | null> {
  const current = await getCollectionTestFlow(input.platformProjectId, input.flowId);
  if (!current) return null;

  const db = getDb();
  const now = new Date();
  const nextFlow = input.flow
    ? (input.flow as unknown as Record<string, unknown>)
    : current.flow;
  await db
    .update(collectionTestFlows)
    .set({
      name: input.name?.trim() || current.name,
      flow: nextFlow,
      updatedAt: now,
    })
    .where(eq(collectionTestFlows.id, current.id));

  return getCollectionTestFlow(input.platformProjectId, input.flowId);
}

export async function persistFlowRunResult(input: {
  platformProjectId: string;
  flowId: string;
  verdict: CollectionVerdict;
  lastRun: CollectionFlowLastRun;
}): Promise<CollectionTestFlowRow | null> {
  const current = await getCollectionTestFlow(input.platformProjectId, input.flowId);
  if (!current) return null;
  const doc = ensureFlowDocument(current.flow);
  const next: CollectionTestFlowDocument = {
    ...doc,
    lastVerdict: input.verdict,
    lastRun: input.lastRun,
  };
  return patchCollectionTestFlow({
    platformProjectId: input.platformProjectId,
    flowId: input.flowId,
    flow: next,
  });
}
