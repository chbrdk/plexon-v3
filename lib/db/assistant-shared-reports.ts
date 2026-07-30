import { desc, eq } from 'drizzle-orm';
import { getDb } from './index';
import { assistantSharedReports } from './schema';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';
import type { ReportNarrative } from '@/lib/assistant/reports/types';

export type StoredSharedReport = {
  id: string;
  conversationId: string;
  userId: string;
  title: string;
  uiLayout: UiLayout;
  narrative: ReportNarrative;
  shareTokenHash: string;
  isPublic: boolean;
  createdAt: Date;
};

function mapRow(row: typeof assistantSharedReports.$inferSelect): StoredSharedReport {
  return {
    id: row.id,
    conversationId: row.conversationId,
    userId: row.userId,
    title: row.title,
    uiLayout: row.uiLayout as UiLayout,
    narrative: row.narrative as ReportNarrative,
    shareTokenHash: row.shareTokenHash,
    isPublic: row.isPublic === 1,
    createdAt: row.createdAt,
  };
}

export async function createSharedReport(input: {
  id: string;
  conversationId: string;
  userId: string;
  title: string;
  uiLayout: UiLayout;
  narrative: ReportNarrative;
  shareTokenHash: string;
  isPublic?: boolean;
}): Promise<StoredSharedReport> {
  const db = getDb();
  await db.insert(assistantSharedReports).values({
    id: input.id,
    conversationId: input.conversationId,
    userId: input.userId,
    title: input.title,
    uiLayout: input.uiLayout as Record<string, unknown>,
    narrative: input.narrative as Record<string, unknown>,
    shareTokenHash: input.shareTokenHash,
    isPublic: input.isPublic === false ? 0 : 1,
  });
  const row = await getSharedReportById(input.id);
  if (!row) throw new Error('Failed to create shared report');
  return row;
}

export async function getSharedReportById(id: string): Promise<StoredSharedReport | null> {
  const db = getDb();
  const [row] = await db.select().from(assistantSharedReports).where(eq(assistantSharedReports.id, id)).limit(1);
  return row ? mapRow(row) : null;
}

export async function getSharedReportByTokenHash(tokenHash: string): Promise<StoredSharedReport | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(assistantSharedReports)
    .where(eq(assistantSharedReports.shareTokenHash, tokenHash))
    .limit(1);
  return row ? mapRow(row) : null;
}

export async function listSharedReportsForConversation(conversationId: string): Promise<StoredSharedReport[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(assistantSharedReports)
    .where(eq(assistantSharedReports.conversationId, conversationId))
    .orderBy(desc(assistantSharedReports.createdAt));
  return rows.map(mapRow);
}
