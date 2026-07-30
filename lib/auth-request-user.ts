/* ------------------------------------------------------------------ */
/*  PLEXON – getRequestUser (session + optional Bearer API token)     */
/* ------------------------------------------------------------------ */

import { createHash } from 'crypto';
import { auth } from '@/auth';
import { getDb } from '@/lib/db';
import { users, USER_ROLE } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getUserByTokenHash } from '@/lib/db/api-tokens';

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export type RequestUser = { id: string; role: string };

/** If request has Authorization: Bearer <token>, resolve to user id and role. */
export async function getUserFromBearerToken(request: Request): Promise<RequestUser | null> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token || !token.startsWith('plexon_') || token.length !== 9 + 64) return null;
  const userId = await getUserByTokenHash(hashToken(token));
  if (!userId) return null;
  if (!process.env.DATABASE_URL) return { id: userId, role: USER_ROLE.USER };
  try {
    const db = getDb();
    const [row] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
    return { id: userId, role: (row?.role as string) ?? USER_ROLE.USER };
  } catch {
    return { id: userId, role: USER_ROLE.USER };
  }
}

/** Get authenticated user: Bearer token first, then session. Role is read from DB when possible so admin status is up-to-date without re-login. */
export async function getRequestUser(request: Request): Promise<RequestUser | null> {
  const bearer = await getUserFromBearerToken(request);
  if (bearer) return bearer;
  const session = await auth();
  if (!session?.user?.id) return null;
  const sessionRole = (session.user as { role?: string }).role ?? USER_ROLE.USER;
  if (session.user.id === 'demo') return { id: session.user.id, role: sessionRole };
  if (process.env.DATABASE_URL) {
    try {
      const db = getDb();
      const [row] = await db.select({ role: users.role }).from(users).where(eq(users.id, session.user.id)).limit(1);
      const role = (row?.role as string) ?? sessionRole;
      return { id: session.user.id, role };
    } catch {
      return { id: session.user.id, role: sessionRole };
    }
  }
  return { id: session.user.id, role: sessionRole };
}

/** Returns true if the request is from an admin. Use after getRequestUser. */
export function isAdmin(user: RequestUser | null): boolean {
  return user?.role === USER_ROLE.ADMIN;
}

/** Use in admin routes: returns 403 if not admin. Returns the request user if admin. */
export async function requireAdmin(request: Request): Promise<RequestUser | null> {
  const user = await getRequestUser(request);
  if (!user) return null;
  if (user.role !== USER_ROLE.ADMIN) return null;
  return user;
}
