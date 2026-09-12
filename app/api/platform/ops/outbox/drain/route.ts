import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
import {
  hasValidContractHeader,
  isServiceSecretAuthorized,
} from '@/lib/collection-knowledge-pack-auth';
import { drainPlatformOutbox } from '@/lib/platform-outbox';
import { platformJson } from '@/lib/platform-contract';

/**
 * Drain due platform outbox rows (Wave A).
 * Spec: specs/domain/platform-outbox-delivery.md
 */
export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
    if (!isServiceSecretAuthorized(request)) {
      return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    if (!hasValidContractHeader(request)) {
      return apiError('Invalid or missing X-Plexon-Contract-Version', API_STATUS.BAD_REQUEST);
    }

    const body = (await request.json().catch(() => ({}))) as { limit?: unknown };
    const limit =
      typeof body.limit === 'number' && Number.isFinite(body.limit) ? body.limit : 20;
    const result = await drainPlatformOutbox(limit);
    return platformJson(result);
  } catch (e) {
    return handleApiError(e, { context: 'outbox drain' });
  }
}
