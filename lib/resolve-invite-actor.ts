import { eq } from 'drizzle-orm';
import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser, type RequestUser } from '@/lib/auth-request-user';
import {
  hasValidContractHeader,
  isServiceSecretAuthorized,
} from '@/lib/collection-knowledge-pack-auth';
import { getDb } from '@/lib/db';
import { users, USER_ROLE } from '@/lib/db/schema';

const PLEXON_USER_HEADER = 'X-Plexon-User-Id';

/** Session/Bearer first; else service secret + X-Plexon-User-Id with DB role. */
export async function resolveInviteActor(request: Request): Promise<RequestUser | null> {
  const sessionUser = await getRequestUser(request);
  if (sessionUser) return sessionUser;

  if (!isServiceSecretAuthorized(request)) return null;
  if (!hasValidContractHeader(request)) return null;

  const plexonUserId = request.headers.get(PLEXON_USER_HEADER)?.trim();
  if (!plexonUserId) return null;

  if (!process.env.DATABASE_URL) {
    return { id: plexonUserId, role: USER_ROLE.USER };
  }
  try {
    const db = getDb();
    const [row] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, plexonUserId))
      .limit(1);
    return { id: plexonUserId, role: (row?.role as string) ?? USER_ROLE.USER };
  } catch {
    return { id: plexonUserId, role: USER_ROLE.USER };
  }
}

export function inviteActorUnauthorized(request: Request) {
  if (isServiceSecretAuthorized(request) && !hasValidContractHeader(request)) {
    return apiError('Unsupported contract version', API_STATUS.BAD_REQUEST);
  }
  if (isServiceSecretAuthorized(request) && !request.headers.get(PLEXON_USER_HEADER)?.trim()) {
    return apiError(`${PLEXON_USER_HEADER} required`, API_STATUS.BAD_REQUEST);
  }
  return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
}
