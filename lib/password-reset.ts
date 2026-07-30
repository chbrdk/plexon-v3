/* ------------------------------------------------------------------ */
/*  PLEXON – Password reset tokens (DB)                               */
/* ------------------------------------------------------------------ */

import { createHash, randomBytes, randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { passwordResetTokens, users } from '@/lib/db/schema';

const TOKEN_BYTES = 32;
const TTL_MS = 60 * 60 * 1000;

export function hashPasswordResetToken(plain: string): string {
  return createHash('sha256').update(plain, 'utf8').digest('hex');
}

export async function createPasswordResetTokenForEmail(email: string): Promise<{ plainToken: string; userId: string } | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const db = getDb();
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalized)).limit(1);
  if (!row) return null;

  const plainToken = randomBytes(TOKEN_BYTES).toString('hex');
  const tokenHash = hashPasswordResetToken(plainToken);
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + TTL_MS);

  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, row.id));
  await db.insert(passwordResetTokens).values({
    id,
    userId: row.id,
    tokenHash,
    expiresAt,
    createdAt: new Date(),
  });

  return { plainToken, userId: row.id };
}

export async function consumePasswordResetToken(
  plainToken: string,
  newPasswordHash: string
): Promise<{ ok: true } | { ok: false; reason: 'invalid' | 'expired' | 'used' }> {
  const tokenHash = hashPasswordResetToken(plainToken.trim());
  const db = getDb();
  const now = new Date();
  const [tok] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash)).limit(1);
  if (!tok) return { ok: false, reason: 'invalid' };
  if (tok.consumedAt) return { ok: false, reason: 'used' };
  if (tok.expiresAt <= now) return { ok: false, reason: 'expired' };

  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, tok.userId));
    await tx.update(passwordResetTokens).set({ consumedAt: now }).where(eq(passwordResetTokens.id, tok.id));
  });

  return { ok: true };
}
