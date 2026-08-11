import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser, requireAdmin } from '@/lib/auth-request-user';
import { canManageCompany } from '@/lib/auth-company-access';
import { getPlatformProjectById, updatePlatformProject } from '@/lib/db/platform-projects';
import { isPlatformProjectStatus } from '@/lib/platform-companies';
import {
  hardDeletePlatformProjectAfterArchive,
  setPlatformProjectLifecycleStatus,
} from '@/lib/platform-project-lifecycle';

async function authorizeProjectManage(request: Request, companyId: string) {
  const admin = await requireAdmin(request);
  if (admin) return admin;
  const user = await getRequestUser(request);
  if (user && (await canManageCompany(user, companyId))) return user;
  return null;
}

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const project = await getPlatformProjectById(id);
  if (!project) return apiError('Not found', API_STATUS.NOT_FOUND);
  const user = await authorizeProjectManage(request, project.companyId);
  if (!user) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  const { getBindingsForPlatformProject } = await import('@/lib/db/platform-project-bindings');
  const bindings = await getBindingsForPlatformProject(id);
  return Response.json({ ...project, bindings });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const project = await getPlatformProjectById(id);
  if (!project) return apiError('Not found', API_STATUS.NOT_FOUND);
  const user = await authorizeProjectManage(request, project.companyId);
  if (!user) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  let body: {
    name?: unknown;
    domain?: unknown;
    status?: unknown;
    metadata?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
  }
  const patch: Parameters<typeof updatePlatformProject>[1] = {};
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return apiError('Invalid name', API_STATUS.BAD_REQUEST);
    }
    patch.name = body.name;
  }
  if (body.domain !== undefined) {
    patch.domain = typeof body.domain === 'string' ? body.domain : null;
  }
  if (body.status !== undefined) {
    if (!isPlatformProjectStatus(body.status)) {
      return apiError('Invalid status', API_STATUS.BAD_REQUEST);
    }
    patch.status = body.status;
  }
  if (body.metadata !== undefined) {
    patch.metadata =
      body.metadata !== null && typeof body.metadata === 'object'
        ? (body.metadata as Record<string, unknown>)
        : null;
  }
  if (Object.keys(patch).length === 0) {
    return apiError('No fields to update', API_STATUS.BAD_REQUEST);
  }

  const { getBindingsForPlatformProject } = await import('@/lib/db/platform-project-bindings');

  if (patch.status !== undefined && Object.keys(patch).length === 1) {
    const { project: next, syncResults } = await setPlatformProjectLifecycleStatus(
      id,
      patch.status,
      { source: 'plexon-admin-lifecycle' }
    );
    const bindings = await getBindingsForPlatformProject(id);
    return Response.json({ ...next, bindings, syncResults });
  }

  await updatePlatformProject(id, patch);

  let syncResults: Awaited<
    ReturnType<typeof setPlatformProjectLifecycleStatus>
  >['syncResults'] | undefined;
  if (patch.status !== undefined) {
    const lifecycle = await setPlatformProjectLifecycleStatus(id, patch.status, {
      source: 'plexon-admin-lifecycle',
    });
    syncResults = lifecycle.syncResults;
  }

  const next = await getPlatformProjectById(id);
  const bindings = await getBindingsForPlatformProject(id);
  return Response.json({ ...next, bindings, ...(syncResults ? { syncResults } : {}) });
}

/** Global admin only — archive fan-out then cascade-delete Plexon Collection. */
export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  const project = await getPlatformProjectById(id);
  if (!project) return apiError('Not found', API_STATUS.NOT_FOUND);
  try {
    await hardDeletePlatformProjectAfterArchive(id, { source: 'plexon-admin-hard-delete' });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Delete failed';
    return apiError(message, API_STATUS.BAD_REQUEST);
  }
  return new Response(null, { status: 204 });
}
