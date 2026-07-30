/* ------------------------------------------------------------------ */
/*  PLEXON – POST /api/auth/register                                  */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { apiError, handleApiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, registerBodySchema } from '@/lib/api-schemas';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const SALT_ROUNDS = 10;

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    console.error('[PLEXON] DATABASE_URL is not set');
    return apiError('Server misconfiguration: database not configured.', API_STATUS.UNAVAILABLE);
  }
  try {
    const parsed = await parseApiBody(request, registerBodySchema);
    if (parsed instanceof NextResponse) return parsed;
    const email = parsed.email.trim().toLowerCase();
    const password = parsed.password;
    const name = parsed.name?.trim() ?? null;

    const db = getDb();
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return apiError('Email already registered.', API_STATUS.CONFLICT);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const id = randomUUID();
    await db.insert(users).values({
      id,
      email,
      passwordHash,
      name: name || null,
    });

    return NextResponse.json({ success: true, userId: id });
  } catch (e) {
    return handleApiError(e, { context: 'Register failed', publicMessage: 'Registration failed.' });
  }
}
