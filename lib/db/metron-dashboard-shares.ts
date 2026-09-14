import { eq } from 'drizzle-orm';
import { getDb } from './index';
import { metronDashboardShares } from './schema';
import type { MetronDashboardShareSnapshot } from '@/lib/assistant/ui-blocks/types';

export type StoredMetronDashboardShare = {
  id: string;
  createdByUserId: string;
  platformProjectId: string | null;
  dashboardId: string;
  shareTokenHash: string;
  reportSnapshot: MetronDashboardShareSnapshot;
  createdAt: Date;
};

function mapRow(row: typeof metronDashboardShares.$inferSelect): StoredMetronDashboardShare {
  return {
    id: row.id,
    createdByUserId: row.createdByUserId,
    platformProjectId: row.platformProjectId ?? null,
    dashboardId: row.dashboardId,
    shareTokenHash: row.shareTokenHash,
    reportSnapshot: row.reportSnapshot as MetronDashboardShareSnapshot,
    createdAt: row.createdAt,
  };
}

export async function createMetronDashboardShare(input: {
  id: string;
  createdByUserId: string;
  platformProjectId?: string | null;
  dashboardId: string;
  shareTokenHash: string;
  reportSnapshot: MetronDashboardShareSnapshot;
}): Promise<StoredMetronDashboardShare> {
  const db = getDb();
  await db.insert(metronDashboardShares).values({
    id: input.id,
    createdByUserId: input.createdByUserId,
    platformProjectId: input.platformProjectId?.trim() || null,
    dashboardId: input.dashboardId,
    shareTokenHash: input.shareTokenHash,
    reportSnapshot: input.reportSnapshot as unknown as Record<string, unknown>,
  });
  const row = await getMetronDashboardShareById(input.id);
  if (!row) throw new Error('Failed to create metron dashboard share');
  return row;
}

export async function getMetronDashboardShareById(
  id: string,
): Promise<StoredMetronDashboardShare | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(metronDashboardShares)
    .where(eq(metronDashboardShares.id, id))
    .limit(1);
  return row ? mapRow(row) : null;
}

export async function getMetronDashboardShareByTokenHash(
  tokenHash: string,
): Promise<StoredMetronDashboardShare | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(metronDashboardShares)
    .where(eq(metronDashboardShares.shareTokenHash, tokenHash))
    .limit(1);
  return row ? mapRow(row) : null;
}
