import { API_STATUS, apiError } from '@/lib/api-error-handler';
import {
  hasValidContractHeader,
  isServiceSecretAuthorized,
} from '@/lib/collection-knowledge-pack-auth';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { USER_ROLE } from '@/lib/db/schema';
import { platformJson } from '@/lib/platform-contract';
import { userCanViewPlatformProject } from '@/lib/platform-project-access';
import { syncPlatformProjectToProducts } from '@/lib/platform-project-sync-service';

const PLEXON_USER_HEADER = 'X-Plexon-User-Id';

/**
 * Service BFF: upsert sibling capability mirrors for one Collection.
 * Requires service secret + contract header + `X-Plexon-User-Id`.
 * Reuses `syncPlatformProjectToProducts` (same core as session `/projects/:id/sync`).
 * Body optional: `{ productIds?: ('checkion'|'audion'|'brandion'|'creation'|'spirion')[] }`
 * — omit to fan out all Phase-1 mirror products (picker intent).
 * Legacy `dig` in body is accepted and mapped to `spirion` for one release.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string }> }
) {
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

  const { platformProjectId: rawId } = await ctx.params;
  const platformProjectId = rawId?.trim();
  if (!platformProjectId) {
    return apiError('Invalid project id', API_STATUS.BAD_REQUEST);
  }

  const project = await getPlatformProjectById(platformProjectId);
  if (!project) return apiError('Not found', API_STATUS.NOT_FOUND);

  const allowed = await userCanViewPlatformProject(
    plexonUserId,
    USER_ROLE.USER,
    platformProjectId
  );
  if (!allowed) return apiError('Forbidden', API_STATUS.FORBIDDEN);

  let body: { productIds?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  type MirrorProductId = 'checkion' | 'audion' | 'brandion' | 'creation' | 'spirion';
  const onlyProducts = Array.isArray(body.productIds)
    ? (body.productIds
        .map((id) => (id === 'dig' ? 'spirion' : id))
        .filter(
          (id): id is MirrorProductId =>
            id === 'checkion' ||
            id === 'audion' ||
            id === 'brandion' ||
            id === 'creation' ||
            id === 'spirion'
        ) as MirrorProductId[])
    : undefined;

  try {
    const results = await syncPlatformProjectToProducts(platformProjectId, {
      source: 'plexon-provisioning-project-sync',
      onlyProducts: onlyProducts?.length ? onlyProducts : undefined,
    });
    return platformJson({
      platformProjectId,
      synced: 1,
      results,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sync failed';
    return apiError(message, API_STATUS.BAD_REQUEST);
  }
}
