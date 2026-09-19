import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { requireAdmin } from '@/lib/auth-request-user';
import {
  getCompanyClientSharePolicy,
  patchCompanyClientSharePolicy,
} from '@/lib/creation-client-share';

/**
 * GET/PATCH company Client Page Share defaults (P6).
 * Spec: specs/domain/creation-client-share.md
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const { id } = await ctx.params;
  const companyId = id?.trim();
  if (!companyId) return apiError('Invalid company id', API_STATUS.BAD_REQUEST);

  const result = await getCompanyClientSharePolicy(companyId, admin);
  if (!result.ok) return apiError(result.status === 404 ? 'Not found' : 'Forbidden', result.status);
  return Response.json(result.policy);
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError('Forbidden', API_STATUS.FORBIDDEN);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);

  const { id } = await ctx.params;
  const companyId = id?.trim();
  if (!companyId) return apiError('Invalid company id', API_STATUS.BAD_REQUEST);

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const result = await patchCompanyClientSharePolicy(companyId, admin, {
    enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
    allowPublicLink: typeof body.allowPublicLink === 'boolean' ? body.allowPublicLink : undefined,
    requirePassword: typeof body.requirePassword === 'boolean' ? body.requirePassword : undefined,
    maxTtlDays:
      body.maxTtlDays === null
        ? null
        : typeof body.maxTtlDays === 'number'
          ? body.maxTtlDays
          : undefined,
    allowLiveHead: typeof body.allowLiveHead === 'boolean' ? body.allowLiveHead : undefined,
    allowEmailAllowlist:
      typeof body.allowEmailAllowlist === 'boolean' ? body.allowEmailAllowlist : undefined,
  });

  if (!result.ok) {
    return apiError(
      result.error || (result.status === 404 ? 'Not found' : 'Forbidden'),
      result.status
    );
  }
  return Response.json(result.policy);
}
