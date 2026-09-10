import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { acceptCollectionInvite } from '@/lib/collection-invites';
import { platformJson } from '@/lib/platform-contract';

/**
 * Session: accept a Collection invite token.
 * Spec: specs/api/collection-invites.md
 */
export async function POST(
  _request: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const user = await getRequestUser(_request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

  const { token: raw } = await ctx.params;
  const token = raw?.trim();
  if (!token) return apiError('Not found', API_STATUS.NOT_FOUND);

  const result = await acceptCollectionInvite(token, user);
  if (!result.ok) return apiError(result.error, result.status);
  const { ok: _ok, ...payload } = result;
  return platformJson(payload);
}
