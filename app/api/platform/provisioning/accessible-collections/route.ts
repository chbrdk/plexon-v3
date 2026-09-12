import { API_STATUS, apiError } from '@/lib/api-error-handler';
import {
  hasValidContractHeader,
  isServiceSecretAuthorized,
} from '@/lib/collection-knowledge-pack-auth';
import { listAccessibleCollectionsForUser } from '@/lib/list-accessible-collections';
import { platformJson } from '@/lib/platform-contract';

const PLEXON_USER_HEADER = 'X-Plexon-User-Id';

/**
 * Service: list Collections a Plexon user can see (same directory as Sync).
 * Requires service secret + contract header + `X-Plexon-User-Id`.
 * Query: `limit` (1–100, default 50), `cursor`.
 */
export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  if (!isServiceSecretAuthorized(request)) {
    return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  }
  if (!hasValidContractHeader(request)) {
    return apiError('Unsupported contract version', API_STATUS.BAD_REQUEST);
  }

  const plexonUserId = request.headers.get(PLEXON_USER_HEADER)?.trim();
  if (!plexonUserId) {
    return apiError(`${PLEXON_USER_HEADER} required`, API_STATUS.BAD_REQUEST);
  }

  try {
    const url = new URL(request.url);
    const limitRaw = url.searchParams.get('limit');
    const limit = limitRaw ? Number(limitRaw) : undefined;
    const cursor = url.searchParams.get('cursor');
    const result = await listAccessibleCollectionsForUser(plexonUserId, {
      limit: Number.isFinite(limit) ? limit : undefined,
      cursor,
    });
    return platformJson(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'List failed';
    return apiError(message, API_STATUS.BAD_REQUEST);
  }
}
