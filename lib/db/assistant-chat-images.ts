/**
 * Durable helpers for assistant_chat_images.
 * Spec: specs/domain/assistant-image-attachments.md
 */

import { sql } from 'drizzle-orm';
import { getDb } from './index';

let ensured = false;

/** Create/alter assistant_chat_images when DATABASE_URL is set (idempotent). */
export async function ensureAssistantChatImagesSchema(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (ensured) return;
  const db = getDb();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS assistant_chat_images (
      id text PRIMARY KEY,
      user_id text,
      data_url text NOT NULL,
      mime_type text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL
    )
  `);
  await db.execute(sql`
    ALTER TABLE assistant_chat_images ADD COLUMN IF NOT EXISTS user_id text
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS assistant_chat_images_user_id_idx
    ON assistant_chat_images (user_id)
  `);
  ensured = true;
}

export async function dbPutAssistantChatImage(row: {
  id: string;
  userId: string;
  dataUrl: string;
  mimeType: string;
  expiresAt: Date;
}): Promise<void> {
  await ensureAssistantChatImagesSchema();
  const db = getDb();
  await db.execute(sql`
    INSERT INTO assistant_chat_images (id, user_id, data_url, mime_type, expires_at)
    VALUES (
      ${row.id},
      ${row.userId},
      ${row.dataUrl},
      ${row.mimeType},
      ${row.expiresAt.toISOString()}::timestamptz
    )
    ON CONFLICT (id) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      data_url = EXCLUDED.data_url,
      mime_type = EXCLUDED.mime_type,
      expires_at = EXCLUDED.expires_at
  `);
  await db.execute(sql`DELETE FROM assistant_chat_images WHERE expires_at < now()`);
}

export async function dbGetAssistantChatImage(
  id: string,
  userId: string,
): Promise<{ dataUrl: string; mimeType: string } | null> {
  await ensureAssistantChatImagesSchema();
  const db = getDb();
  const result = await db.execute(sql`
    SELECT data_url, mime_type
    FROM assistant_chat_images
    WHERE id = ${id}
      AND user_id = ${userId}
      AND expires_at > now()
    LIMIT 1
  `);
  const row = result.rows[0] as { data_url?: string; mime_type?: string } | undefined;
  if (!row?.data_url || !row.mime_type) return null;
  return { dataUrl: row.data_url, mimeType: row.mime_type };
}

export async function dbCountActiveAssistantChatImages(userId: string): Promise<number> {
  await ensureAssistantChatImagesSchema();
  const db = getDb();
  const result = await db.execute(sql`
    SELECT count(*)::int AS count
    FROM assistant_chat_images
    WHERE user_id = ${userId}
      AND expires_at > now()
  `);
  const row = result.rows[0] as { count?: number } | undefined;
  return Number(row?.count ?? 0);
}

export async function dbCountRecentAssistantChatImages(
  userId: string,
  sinceMs: number,
): Promise<number> {
  await ensureAssistantChatImagesSchema();
  const db = getDb();
  const sinceIso = new Date(sinceMs).toISOString();
  const result = await db.execute(sql`
    SELECT count(*)::int AS count
    FROM assistant_chat_images
    WHERE user_id = ${userId}
      AND created_at > ${sinceIso}::timestamptz
  `);
  const row = result.rows[0] as { count?: number } | undefined;
  return Number(row?.count ?? 0);
}
