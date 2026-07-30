/* ------------------------------------------------------------------ */
/*  PLEXON – POST /api/auth/change-password                            */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-request-user';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, changePasswordBodySchema } from '@/lib/api-schemas';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function POST(request: Request) {
  const requestUser = await getRequestUser(request);
  if (!requestUser) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (requestUser.id === 'demo') return apiError('Demo user cannot change password', API_STATUS.BAD_REQUEST);
  const parsed = await parseApiBody(request, changePasswordBodySchema);
  if (parsed instanceof NextResponse) return parsed;
  const currentPassword = parsed.current_password;
  const newPassword = parsed.new_password;

  const db = getDb();
  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, requestUser.id))
    .limit(1);
  if (!user) return apiError('User not found', API_STATUS.NOT_FOUND);
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return apiError('Current password is incorrect', API_STATUS.BAD_REQUEST);
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await db.update(users).set({ passwordHash }).where(eq(users.id, requestUser.id));
  return NextResponse.json({ success: true });
}
