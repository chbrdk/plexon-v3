import { API_STATUS, apiError } from '@/lib/api-error-handler';
import {
  hasValidContractHeader,
  isServiceSecretAuthorized,
} from '@/lib/collection-knowledge-pack-auth';
import { platformJson } from '@/lib/platform-contract';
import { syncAccessibleCapabilityMirrors } from '@/lib/sync-accessible-capability-mirrors';

const PLEXON_USER_HEADER = 'X-Plexon-User-Id';

/**
 * Service: upsert capability mirrors for all Collections a Plexon user can see.
 * Requires service secret + contract header + `X-Plexon-User-Id`.
 * Body optional: `{ productIds?: ('checkion'|'audion'|'brandion'|'creation')[] }`
 */
export async function POST(request: Request) {
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

  let body: { productIds?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  try {
    const result = await syncAccessibleCapabilityMirrors(plexonUserId, {
      productIds: body.productIds,
      source: 'plexon-provisioning-sync-capability-mirrors',
    });
    return platformJson(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sync failed';
    return apiError(message, API_STATUS.BAD_REQUEST);
  }
}
