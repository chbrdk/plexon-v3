import { asc, eq } from 'drizzle-orm';
import { getDb } from './index';
import { assistantReportPins } from './schema';
import type { UiBlock } from '@/lib/assistant/ui-blocks/types';

export type StoredReportPin = {
  id: string;
  conversationId: string;
  userId: string;
  messageId: string;
  blockId: string;
  blockSnapshot: UiBlock;
  sortOrder: number;
  createdAt: Date;
};

function mapRow(row: typeof assistantReportPins.$inferSelect): StoredReportPin {
  return {
    id: row.id,
    conversationId: row.conversationId,
    userId: row.userId,
    messageId: row.messageId,
    blockId: row.blockId,
    blockSnapshot: row.blockSnapshot as UiBlock,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
  };
}

export async function listReportPinsForConversation(conversationId: string): Promise<StoredReportPin[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(assistantReportPins)
    .where(eq(assistantReportPins.conversationId, conversationId))
    .orderBy(asc(assistantReportPins.sortOrder), asc(assistantReportPins.createdAt));
  return rows.map(mapRow);
}

export async function getReportPinById(id: string): Promise<StoredReportPin | null> {
  const db = getDb();
  const [row] = await db.select().from(assistantReportPins).where(eq(assistantReportPins.id, id)).limit(1);
  return row ? mapRow(row) : null;
}

export async function createReportPin(input: {
  id: string;
  conversationId: string;
  userId: string;
  messageId: string;
  blockId: string;
  blockSnapshot: UiBlock;
  sortOrder: number;
}): Promise<StoredReportPin> {
  const db = getDb();
  await db.insert(assistantReportPins).values({
    id: input.id,
    conversationId: input.conversationId,
    userId: input.userId,
    messageId: input.messageId,
    blockId: input.blockId,
    blockSnapshot: input.blockSnapshot as Record<string, unknown>,
    sortOrder: input.sortOrder,
  });
  const row = await getReportPinById(input.id);
  if (!row) throw new Error('Failed to create report pin');
  return row;
}

export async function deleteReportPin(id: string): Promise<void> {
  const db = getDb();
  await db.delete(assistantReportPins).where(eq(assistantReportPins.id, id));
}

export async function countReportPinsForConversation(conversationId: string): Promise<number> {
  const pins = await listReportPinsForConversation(conversationId);
  return pins.length;
}

export async function nextReportPinSortOrder(conversationId: string): Promise<number> {
  const pins = await listReportPinsForConversation(conversationId);
  if (pins.length === 0) return 0;
  return Math.max(...pins.map((p) => p.sortOrder)) + 1;
}
