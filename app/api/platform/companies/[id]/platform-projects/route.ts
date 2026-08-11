import { randomUUID } from 'crypto';
import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { canViewCompany } from '@/lib/auth-company-access';
import { userCanCreatePlatformProject } from '@/lib/assistant/user-eligibility';
import { getCompanyById } from '@/lib/db/companies';
import { createPlatformProject } from '@/lib/db/platform-projects';
import { ensureBindingPlaceholders } from '@/lib/db/platform-project-bindings';
import { upsertUserPlatformProjectAssignment } from '@/lib/db/user-platform-project-assignments';
import { PLATFORM_PROJECT_ASSIGNMENT_ROLE } from '@/lib/platform-provisioning';
import { isPlatformProjectStatus } from '@/lib/platform-companies';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { syncPlatformProjectToProducts } from '@/lib/platform-project-sync-service';

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await ctx.params;
  const user = await getRequestUser(request);
  if (!user) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const allowed = await userCanCreatePlatformProject(user, companyId);
  if (!allowed) return apiError('Forbidden', API_STATUS.FORBIDDEN);

  const company = await getCompanyById(companyId);
  if (!company) return apiError('Not found', API_STATUS.NOT_FOUND);

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

  if (typeof body.name !== 'string' || !body.name.trim()) {
    return apiError('name is required', API_STATUS.BAD_REQUEST);
  }

  const status =
    body.status !== undefined && isPlatformProjectStatus(body.status) ? body.status : undefined;
  const domain = typeof body.domain === 'string' ? body.domain : null;
  const metadata =
    body.metadata !== undefined && body.metadata !== null && typeof body.metadata === 'object'
      ? (body.metadata as Record<string, unknown>)
      : null;

  const id = randomUUID();
  await createPlatformProject({
    id,
    companyId,
    name: body.name,
    domain,
    metadata,
    status,
    createdByUserId: user.id,
  });
  await ensureBindingPlaceholders(id);
  await upsertUserPlatformProjectAssignment(user.id, id, PLATFORM_PROJECT_ASSIGNMENT_ROLE.ADMIN);
  // Phase 1: Collection create always provisions CHECKION + AUDION.
  const syncResults = await syncPlatformProjectToProducts(id, {
    source: 'plexon-platform-create',
  });

  const row = await getPlatformProjectById(id);
  return Response.json({ ...row, syncResults }, { status: 201 });
}

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await ctx.params;
  const user = await getRequestUser(request);
  if (!user) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!(await canViewCompany(user, companyId))) {
    return apiError('Forbidden', API_STATUS.FORBIDDEN);
  }
  const { listPlatformProjectsForCompany } = await import('@/lib/db/platform-projects');
  const includeArchived = new URL(request.url).searchParams.get('includeArchived') === '1';
  const items = await listPlatformProjectsForCompany(companyId, { includeArchived });
  return Response.json({ items });
}
