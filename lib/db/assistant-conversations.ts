import { desc, eq } from 'drizzle-orm';
import { getDb } from './index';
import { assistantConversations } from './schema';

export type StoredAssistantConversation = {
  id: string;
  userId: string;
  title: string | null;
  platformProjectId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapRow(row: typeof assistantConversations.$inferSelect): StoredAssistantConversation {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    platformProjectId: row.platformProjectId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function createAssistantConversation(input: {
  id: string;
  userId: string;
  title?: string | null;
  platformProjectId?: string | null;
}): Promise<StoredAssistantConversation> {
  const db = getDb();
  const now = new Date();
  await db.insert(assistantConversations).values({
    id: input.id,
    userId: input.userId,
    title: input.title?.trim() || null,
    platformProjectId: input.platformProjectId ?? null,
    createdAt: now,
    updatedAt: now,
  });
  const row = await getAssistantConversationById(input.id);
  if (!row) throw new Error('Failed to create conversation');
  return row;
}

export async function getAssistantConversationById(id: string): Promise<StoredAssistantConversation | null> {
  const db = getDb();
  const [row] = await db.select().from(assistantConversations).where(eq(assistantConversations.id, id)).limit(1);
  return row ? mapRow(row) : null;
}

export async function listAssistantConversationsForUser(userId: string): Promise<StoredAssistantConversation[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(assistantConversations)
    .where(eq(assistantConversations.userId, userId))
    .orderBy(desc(assistantConversations.updatedAt));
  return rows.map(mapRow);
}

export async function updateAssistantConversation(
  id: string,
  patch: { title?: string | null; platformProjectId?: string | null }
): Promise<void> {
  const db = getDb();
  await db
    .update(assistantConversations)
    .set({
      ...(patch.title !== undefined ? { title: patch.title?.trim() || null } : {}),
      ...(patch.platformProjectId !== undefined ? { platformProjectId: patch.platformProjectId } : {}),
      updatedAt: new Date(),
    })
    .where(eq(assistantConversations.id, id));
}

export async function deleteAssistantConversation(id: string): Promise<void> {
  const db = getDb();
  await db.delete(assistantConversations).where(eq(assistantConversations.id, id));
}
