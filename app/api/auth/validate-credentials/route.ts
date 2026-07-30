/* ------------------------------------------------------------------ */
/*  PLEXON – POST /api/auth/validate-credentials (für CHECKION/AUDION) */
/* ------------------------------------------------------------------ */
/* Services (CHECKION, AUDION, …) rufen dies beim Login auf. PLEXON-DB
   bleibt die einzige Quelle für User; die Services speichern nur user_id. */

import { NextResponse } from 'next/server';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, validateCredentialsBodySchema } from '@/lib/api-schemas';
import { eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import bcrypt from 'bcryptjs';
import { platformJson, readServiceSecret } from '@/lib/platform-contract';

export async function POST(request: Request) {
  const secret = readServiceSecret(request);
  const SERVICE_SECRET = process.env.PLEXON_SERVICE_SECRET ?? '';
  if (!SERVICE_SECRET || secret !== SERVICE_SECRET) {
    return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  }
  if (!process.env.DATABASE_URL) {
    return apiError('Database not configured', 503);
  }
  const parsed = await parseApiBody(request, validateCredentialsBodySchema);
  if (parsed instanceof NextResponse) return parsed;
  const email = parsed.email.trim().toLowerCase();
  const password = parsed.password;

  const db = getDb();
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user) {
    return apiError('Invalid credentials', API_STATUS.UNAUTHORIZED);
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return apiError('Invalid credentials', API_STATUS.UNAUTHORIZED);
  }
  return platformJson({
    user: { id: user.id, email: user.email, name: user.name ?? undefined },
  });
}
