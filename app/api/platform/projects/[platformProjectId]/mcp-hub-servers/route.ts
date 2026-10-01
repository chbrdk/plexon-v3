import { NextResponse } from 'next/server';
import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { canManageCompany } from '@/lib/auth-company-access';
import { getPlatformProjectById } from '@/lib/db/platform-projects';
import {
  getMcpServerById,
  listCollectionHubServers,
  upsertCollectionHubServer,
} from '@/lib/mcp-hub/store';

type Ctx = { params: Promise<{ platformProjectId: string }> };

/**
 * Collection Hub server enable toggles (Wave H4).
 * Spec: specs/domain/mcp-hub-collection-scope.md
 */
export async function GET(request: Request, ctx: Ctx) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const { platformProjectId } = await ctx.params;
  const project = await getPlatformProjectById(platformProjectId);
  if (!project) return apiError('Not found', API_STATUS.NOT_FOUND);
  if (!(await canManageCompany(user, project.companyId))) {
    return apiError('Forbidden', API_STATUS.FORBIDDEN);
  }
  const items = await listCollectionHubServers(platformProjectId);
  return NextResponse.json({ items });
}

export async function PUT(request: Request, ctx: Ctx) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const { platformProjectId } = await ctx.params;
  const project = await getPlatformProjectById(platformProjectId);
  if (!project) return apiError('Not found', API_STATUS.NOT_FOUND);
  if (!(await canManageCompany(user, project.companyId))) {
    return apiError('Forbidden', API_STATUS.FORBIDDEN);
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
  }
  const serverId = typeof body.serverId === 'string' ? body.serverId : '';
  if (!serverId || typeof body.enabled !== 'boolean') {
    return apiError('serverId and enabled required', API_STATUS.BAD_REQUEST);
  }
  const server = await getMcpServerById(serverId);
  if (!server || server.status !== 'active') {
    return apiError('Server not active', API_STATUS.BAD_REQUEST);
  }
  const row = await upsertCollectionHubServer({
    platformProjectId,
    serverId,
    enabled: body.enabled,
  });
  const items = await listCollectionHubServers(platformProjectId);
  return NextResponse.json({ item: row, items });
}
