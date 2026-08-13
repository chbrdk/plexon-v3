import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { syncAccessibleCapabilityMirrors } from '@/lib/sync-accessible-capability-mirrors';

/**
 * Session: upsert capability mirrors for all Collections the caller can see.
 * Body optional: `{ productIds?: ('checkion'|'audion'|'brandion'|'creation')[] }`
 * Default = all four Phase-1 products.
 */
export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

  let body: { productIds?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  try {
    const result = await syncAccessibleCapabilityMirrors(user.id, {
      productIds: body.productIds,
      source: 'plexon-me-sync-capability-mirrors',
    });
    return Response.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sync failed';
    return apiError(message, API_STATUS.BAD_REQUEST);
  }
}
