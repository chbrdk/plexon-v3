/* ------------------------------------------------------------------ */
/*  PLEXON – POST /api/auth/register                                  */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, registerBodySchema } from '@/lib/api-schemas';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { USER_ROLE, users } from '@/lib/db/schema';
import { attachPlatformHeaders } from '@/lib/platform-contract';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const SALT_ROUNDS = 10;
const ADMIN_EMAIL = process.env.PLEXON_ADMIN_EMAIL?.trim().toLowerCase();

function pgErrorParts(e: unknown): { code: string | null; detail: string } {
  const err = e as { code?: string; message?: string; cause?: { code?: string; message?: string } };
  const code = err.cause?.code ?? err.code ?? null;
  const detail = (err.cause?.message ?? err.message ?? String(e)).slice(0, 400);
  return { code, detail };
}

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
    const role =
      ADMIN_EMAIL && email === ADMIN_EMAIL ? USER_ROLE.ADMIN : USER_ROLE.USER;

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
      role,
    });

    return attachPlatformHeaders(NextResponse.json({ success: true, userId: id }));
  } catch (e) {
    const { code, detail } = pgErrorParts(e);
    console.error('[PLEXON] Register failed', { code, detail });
    if (/relation .* does not exist/i.test(detail) || code === '42P01') {
      return attachPlatformHeaders(
        NextResponse.json(
          {
            error:
              'Database schema not ready (users table missing). Redeploy after drizzle-kit push succeeds.',
            code,
            detail,
          },
          { status: API_STATUS.UNAVAILABLE },
        ),
      );
    }
    // Surface PG code/detail so Coolify staging can be diagnosed without log access.
    return attachPlatformHeaders(
      NextResponse.json(
        { error: 'Registration failed.', code, detail },
        { status: API_STATUS.INTERNAL_ERROR },
      ),
    );
  }
}
