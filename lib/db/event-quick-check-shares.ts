import { desc, eq } from 'drizzle-orm';
import { getDb } from './index';
import { eventQuickCheckShares } from './schema';
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types';

export type StoredEventQuickCheckShare = {
  id: string;
  runId: string;
  createdByUserId: string;
  shareTokenHash: string;
  reportSnapshot: EventQuickCheckReportModel;
  createdAt: Date;
};

function mapRow(row: typeof eventQuickCheckShares.$inferSelect): StoredEventQuickCheckShare {
  return {
    id: row.id,
    runId: row.runId,
    createdByUserId: row.createdByUserId,
    shareTokenHash: row.shareTokenHash,
    reportSnapshot: row.reportSnapshot as EventQuickCheckReportModel,
    createdAt: row.createdAt,
  };
}

export async function createEventQuickCheckShare(input: {
  id: string;
  runId: string;
  createdByUserId: string;
  shareTokenHash: string;
  reportSnapshot: EventQuickCheckReportModel;
}): Promise<StoredEventQuickCheckShare> {
  const db = getDb();
  await db.insert(eventQuickCheckShares).values({
    id: input.id,
    runId: input.runId,
    createdByUserId: input.createdByUserId,
    shareTokenHash: input.shareTokenHash,
    reportSnapshot: input.reportSnapshot as unknown as Record<string, unknown>,
  });
  const row = await getEventQuickCheckShareById(input.id);
  if (!row) throw new Error('Failed to create quick check share');
  return row;
}

export async function getEventQuickCheckShareById(
  id: string
): Promise<StoredEventQuickCheckShare | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(eventQuickCheckShares)
    .where(eq(eventQuickCheckShares.id, id))
    .limit(1);
  return row ? mapRow(row) : null;
}

export async function getEventQuickCheckShareByTokenHash(
  tokenHash: string
): Promise<StoredEventQuickCheckShare | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(eventQuickCheckShares)
    .where(eq(eventQuickCheckShares.shareTokenHash, tokenHash))
    .limit(1);
  return row ? mapRow(row) : null;
}

export async function listEventQuickCheckSharesForRun(
  runId: string
): Promise<StoredEventQuickCheckShare[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(eventQuickCheckShares)
    .where(eq(eventQuickCheckShares.runId, runId))
    .orderBy(desc(eventQuickCheckShares.createdAt));
  return rows.map(mapRow);
}
