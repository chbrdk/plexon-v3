import { API_STATUS, apiError } from '@/lib/api-error-handler';
import {
  hasValidContractHeader,
  isServiceSecretAuthorized,
} from '@/lib/collection-knowledge-pack-auth';
import { getBindingsForPlatformProject } from '@/lib/db/platform-project-bindings';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { USER_ROLE } from '@/lib/db/schema';
import { isPlatformProjectStatus } from '@/lib/platform-companies';
import { platformJson } from '@/lib/platform-contract';
import { userCanManageCollectionLifecycle } from '@/lib/platform-project-access';
import { setPlatformProjectLifecycleStatus } from '@/lib/platform-project-lifecycle';

const PLEXON_USER_HEADER = 'X-Plexon-User-Id';

/**
 * Product BFF lifecycle: archive / restore Collection (+ federation upsert).
 * Requires service secret + contract header + `X-Plexon-User-Id`.
 * Body: `{ status: 'active' | 'archived' }` only.
 */
export async function PATCH(
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
  const id = rawId?.trim();
  if (!id) return apiError('Invalid project id', API_STATUS.BAD_REQUEST);

  const project = await getPlatformProjectById(id);
  if (!project) return apiError('Not found', API_STATUS.NOT_FOUND);

  const allowed = await userCanManageCollectionLifecycle(
    { id: plexonUserId, role: USER_ROLE.USER },
    id
  );
  if (!allowed) return apiError('Forbidden', API_STATUS.FORBIDDEN);

  let body: { status?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
  }

  if (!isPlatformProjectStatus(body.status)) {
    return apiError('Invalid status', API_STATUS.BAD_REQUEST);
  }

  try {
    const { project: next, syncResults } = await setPlatformProjectLifecycleStatus(id, body.status, {
      source: 'plexon-provisioning-product-lifecycle',
    });
    const bindings = await getBindingsForPlatformProject(id);
    return platformJson({ ...next, bindings, syncResults });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Lifecycle update failed';
    return apiError(message, API_STATUS.BAD_REQUEST);
  }
}
