import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { listAccessibleCollectionsForUser } from '@/lib/list-accessible-collections';

/**
 * Session: list Collections the caller can see (same directory as Sync).
 */
export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

  try {
    const result = await listAccessibleCollectionsForUser(user.id);
    return Response.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'List failed';
    return apiError(message, API_STATUS.BAD_REQUEST);
  }
}
