import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { canManageCompany } from '@/lib/auth-company-access';
import { getBindingsForPlatformProject } from '@/lib/db/platform-project-bindings';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { isPlatformProjectStatus } from '@/lib/platform-companies';
import { setPlatformProjectLifecycleStatus } from '@/lib/platform-project-lifecycle';

/**
 * Company manager lifecycle: archive / restore Collection (+ federation upsert).
 * Body: `{ status: 'active' | 'archived' }` only.
 */
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ platformProjectId: string }> }
) {
  const { platformProjectId } = await ctx.params;
  const id = platformProjectId?.trim();
  if (!id) return apiError('Invalid project id', API_STATUS.BAD_REQUEST);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

  const project = await getPlatformProjectById(id);
  if (!project) return apiError('Not found', API_STATUS.NOT_FOUND);

  if (!(await canManageCompany(user, project.companyId))) {
    return apiError('Forbidden', API_STATUS.FORBIDDEN);
  }

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
      source: 'plexon-company-lifecycle',
    });
    const bindings = await getBindingsForPlatformProject(id);
    return Response.json({ ...next, bindings, syncResults });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Lifecycle update failed';
    return apiError(message, API_STATUS.BAD_REQUEST);
  }
}
