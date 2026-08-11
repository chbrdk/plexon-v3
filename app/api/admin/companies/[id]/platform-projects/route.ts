import { randomUUID } from 'crypto';
import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser, requireAdmin } from '@/lib/auth-request-user';
import { canManageCompany } from '@/lib/auth-company-access';
import { getCompanyById } from '@/lib/db/companies';
import {
  createPlatformProject,
  listPlatformProjectsForCompany,
} from '@/lib/db/platform-projects';
import { ensureBindingPlaceholders } from '@/lib/db/platform-project-bindings';
import { isPlatformProjectStatus } from '@/lib/platform-companies';
import { syncPlatformProjectToProducts } from '@/lib/platform-project-sync-service';

async function authorizeCompanyManage(request: Request, companyId: string) {
  const admin = await requireAdmin(request);
  if (admin) return admin;
  const user = await getRequestUser(request);
  if (user && (await canManageCompany(user, companyId))) return user;
  return null;
}

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await ctx.params;
  const user = await authorizeCompanyManage(request, companyId);
  if (!user) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const company = await getCompanyById(companyId);
  if (!company) return apiError('Not found', API_STATUS.NOT_FOUND);
  // Admin company detail needs archived Collections for restore/hard-delete.
  const items = await listPlatformProjectsForCompany(companyId, { includeArchived: true });
  return Response.json({ items });
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await ctx.params;
  const user = await authorizeCompanyManage(request, companyId);
  if (!user) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
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
  // Phase 1: Collection create always provisions CHECKION + AUDION (failures stay on bindings).
  const syncResults = await syncPlatformProjectToProducts(id, { source: 'plexon-admin-create' });
  const { getPlatformProjectById } = await import('@/lib/db/platform-projects');
  const row = await getPlatformProjectById(id);
  return Response.json({ ...row, syncResults }, { status: 201 });
}
