import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser, requireAdmin } from '@/lib/auth-request-user';
import { canManageCompany } from '@/lib/auth-company-access';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import { syncPlatformProjectToProducts } from '@/lib/platform-project-sync-service';

async function authorizeProjectManage(request: Request, companyId: string) {
  const admin = await requireAdmin(request);
  if (admin) return admin;
  const user = await getRequestUser(request);
  if (user && (await canManageCompany(user, companyId))) return user;
  return null;
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const project = await getPlatformProjectById(id);
  if (!project) return apiError('Not found', API_STATUS.NOT_FOUND);
  const user = await authorizeProjectManage(request, project.companyId);
  if (!user) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  try {
    const results = await syncPlatformProjectToProducts(id, { source: 'plexon-admin-sync' });
    return Response.json({ results });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sync failed';
    return apiError(message, API_STATUS.BAD_REQUEST);
  }
}
