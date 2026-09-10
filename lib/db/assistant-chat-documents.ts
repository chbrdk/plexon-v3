/**
 * Durable helpers for assistant_chat_documents.
 * Spec: specs/domain/assistant-document-attachments.md
 */

import { sql } from 'drizzle-orm';
import { getDb } from './index';

let ensured = false;

export async function ensureAssistantChatDocumentsSchema(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (ensured) return;
  const db = getDb();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS assistant_chat_documents (
      id text PRIMARY KEY,
      user_id text,
      filename text NOT NULL,
      extracted_text text NOT NULL,
      char_count integer NOT NULL,
      truncated integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL
    )
  `);
  await db.execute(sql`
    ALTER TABLE assistant_chat_documents ADD COLUMN IF NOT EXISTS user_id text
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS assistant_chat_documents_user_id_idx
    ON assistant_chat_documents (user_id)
  `);
  ensured = true;
}

export async function dbPutAssistantChatDocument(row: {
  id: string;
  userId: string;
  filename: string;
  extractedText: string;
  charCount: number;
  truncated: boolean;
  expiresAt: Date;
}): Promise<void> {
  await ensureAssistantChatDocumentsSchema();
  const db = getDb();
  await db.execute(sql`
    INSERT INTO assistant_chat_documents (
      id, user_id, filename, extracted_text, char_count, truncated, expires_at
    )
    VALUES (
      ${row.id},
      ${row.userId},
      ${row.filename},
      ${row.extractedText},
      ${row.charCount},
      ${row.truncated ? 1 : 0},
      ${row.expiresAt.toISOString()}::timestamptz
    )
    ON CONFLICT (id) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      filename = EXCLUDED.filename,
      extracted_text = EXCLUDED.extracted_text,
      char_count = EXCLUDED.char_count,
      truncated = EXCLUDED.truncated,
      expires_at = EXCLUDED.expires_at
  `);
  await db.execute(sql`DELETE FROM assistant_chat_documents WHERE expires_at < now()`);
}

export async function dbGetAssistantChatDocument(
  id: string,
  userId: string,
): Promise<{
  filename: string;
  extractedText: string;
  charCount: number;
  truncated: boolean;
} | null> {
  await ensureAssistantChatDocumentsSchema();
  const db = getDb();
  const result = await db.execute(sql`
    SELECT filename, extracted_text, char_count, truncated
    FROM assistant_chat_documents
    WHERE id = ${id}
      AND user_id = ${userId}
      AND expires_at > now()
    LIMIT 1
  `);
  const row = result.rows[0] as
    | {
        filename?: string;
        extracted_text?: string;
        char_count?: number;
        truncated?: number;
      }
    | undefined;
  if (!row?.filename || typeof row.extracted_text !== 'string') return null;
  return {
    filename: row.filename,
    extractedText: row.extracted_text,
    charCount: Number(row.char_count ?? 0),
    truncated: Number(row.truncated ?? 0) === 1,
  };
}

export async function dbCountActiveAssistantChatDocuments(userId: string): Promise<number> {
  await ensureAssistantChatDocumentsSchema();
  const db = getDb();
  const result = await db.execute(sql`
    SELECT count(*)::int AS count
    FROM assistant_chat_documents
    WHERE user_id = ${userId}
      AND expires_at > now()
  `);
  const row = result.rows[0] as { count?: number } | undefined;
  return Number(row?.count ?? 0);
}

export async function dbCountRecentAssistantChatDocuments(
  userId: string,
  sinceMs: number,
): Promise<number> {
  await ensureAssistantChatDocumentsSchema();
  const db = getDb();
  const sinceIso = new Date(sinceMs).toISOString();
  const result = await db.execute(sql`
    SELECT count(*)::int AS count
    FROM assistant_chat_documents
    WHERE user_id = ${userId}
      AND created_at > ${sinceIso}::timestamptz
  `);
  const row = result.rows[0] as { count?: number } | undefined;
  return Number(row?.count ?? 0);
}
