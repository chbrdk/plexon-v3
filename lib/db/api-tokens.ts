/* ------------------------------------------------------------------ */
/*  PLEXON – API tokens (DB) for Bearer auth                          */
/* ------------------------------------------------------------------ */

import { createHash, randomBytes } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { getDb } from './index';
import { apiTokens } from './schema';

const TOKEN_PREFIX = 'plexon_';
const TOKEN_BYTES = 32;

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function generateTokenString(): string {
  return TOKEN_PREFIX + randomBytes(TOKEN_BYTES).toString('hex');
}

export async function createApiToken(
  userId: string,
  name?: string | null
): Promise<{ id: string; token: string; name: string | null; createdAt: Date }> {
  const db = getDb();
  const token = generateTokenString();
  const tokenHash = hashToken(token);
  const id = randomBytes(16).toString('hex');
  const [row] = await db
    .insert(apiTokens)
    .values({ id, userId, tokenHash, name: name ?? null })
    .returning({ id: apiTokens.id, createdAt: apiTokens.createdAt });
  return { id: row.id, token, name: name ?? null, createdAt: row.createdAt };
}

export async function getUserByTokenHash(tokenHash: string): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ userId: apiTokens.userId })
    .from(apiTokens)
    .where(eq(apiTokens.tokenHash, tokenHash))
    .limit(1);
  return rows.length > 0 ? rows[0].userId : null;
}

export interface ApiTokenListItem {
  id: string;
  name: string | null;
  createdAt: Date;
}

export async function listApiTokens(userId: string): Promise<ApiTokenListItem[]> {
  const db = getDb();
  const rows = await db
    .select({ id: apiTokens.id, name: apiTokens.name, createdAt: apiTokens.createdAt })
    .from(apiTokens)
    .where(eq(apiTokens.userId, userId));
  return rows as ApiTokenListItem[];
}

export async function revokeApiToken(id: string, userId: string): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(apiTokens)
    .where(and(eq(apiTokens.id, id), eq(apiTokens.userId, userId)));
  return (deleted.rowCount ?? 0) > 0;
}
