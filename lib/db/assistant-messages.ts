import { asc, eq } from 'drizzle-orm';
import { getDb } from './index';
import { assistantMessages } from './schema';

export type AssistantMessageRole = 'user' | 'assistant' | 'system';

export type StoredAssistantMessage = {
  id: string;
  conversationId: string;
  role: AssistantMessageRole;
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

function mapRow(row: typeof assistantMessages.$inferSelect): StoredAssistantMessage {
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role as AssistantMessageRole,
    content: row.content,
    metadata: row.metadata ?? null,
    createdAt: row.createdAt,
  };
}

export async function createAssistantMessage(input: {
  id: string;
  conversationId: string;
  role: AssistantMessageRole;
  content: string;
  metadata?: Record<string, unknown> | null;
}): Promise<StoredAssistantMessage> {
  const db = getDb();
  const now = new Date();
  await db.insert(assistantMessages).values({
    id: input.id,
    conversationId: input.conversationId,
    role: input.role,
    content: input.content,
    metadata: input.metadata ?? null,
    createdAt: now,
  });
  const [row] = await db.select().from(assistantMessages).where(eq(assistantMessages.id, input.id)).limit(1);
  if (!row) throw new Error('Failed to create message');
  return mapRow(row);
}

export async function getAssistantMessageById(id: string): Promise<StoredAssistantMessage | null> {
  const db = getDb();
  const [row] = await db.select().from(assistantMessages).where(eq(assistantMessages.id, id)).limit(1);
  return row ? mapRow(row) : null;
}

export async function listAssistantMessagesForConversation(
  conversationId: string
): Promise<StoredAssistantMessage[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(assistantMessages)
    .where(eq(assistantMessages.conversationId, conversationId))
    .orderBy(asc(assistantMessages.createdAt));
  return rows.map(mapRow);
}

export async function updateAssistantMessageMetadata(
  id: string,
  metadata: Record<string, unknown> | null
): Promise<void> {
  const db = getDb();
  await db.update(assistantMessages).set({ metadata }).where(eq(assistantMessages.id, id));
}
