import { eq, sql } from 'drizzle-orm';
import { API_STATUS, apiError, handleApiError } from '@/lib/api-error-handler';
import {
  hasValidContractHeader,
  isServiceSecretAuthorized,
} from '@/lib/collection-knowledge-pack-auth';
import { getDb } from '@/lib/db';
import { platformProjectProductBindings } from '@/lib/db/schema';
import {
  countCollectionProjections,
  countStaleOrFailedFacets,
} from '@/lib/collection-projection';
import { getOutboxMetrics } from '@/lib/platform-outbox';
import { PLATFORM_PROJECT_BINDING_SYNC_STATUS } from '@/lib/platform-companies';
import { platformJson } from '@/lib/platform-contract';

/**
 * Data-plane ops metrics (Wave D).
 * Spec: specs/domain/collection-read-model.md § Ops
 */
export async function GET(request: Request) {
  try {
    if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
    if (!isServiceSecretAuthorized(request)) {
      return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    if (!hasValidContractHeader(request)) {
      return apiError('Invalid or missing X-Plexon-Contract-Version', API_STATUS.BAD_REQUEST);
    }

    const db = getDb();
    const [failedBindings] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(platformProjectProductBindings)
      .where(
        eq(
          platformProjectProductBindings.syncStatus,
          PLATFORM_PROJECT_BINDING_SYNC_STATUS.FAILED
        )
      );
    const [pendingBindings] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(platformProjectProductBindings)
      .where(
        eq(
          platformProjectProductBindings.syncStatus,
          PLATFORM_PROJECT_BINDING_SYNC_STATUS.PENDING
        )
      );

    const [outbox, facetsStaleOrFailed, projections] = await Promise.all([
      getOutboxMetrics(),
      countStaleOrFailedFacets(),
      countCollectionProjections(),
    ]);

    return platformJson({
      outbox,
      bindings: {
        failed: Number(failedBindings?.count) || 0,
        pending: Number(pendingBindings?.count) || 0,
      },
      knowledge: { facetsStaleOrFailed },
      projections: { rows: projections },
    });
  } catch (e) {
    return handleApiError(e, { context: 'data-plane ops' });
  }
}
