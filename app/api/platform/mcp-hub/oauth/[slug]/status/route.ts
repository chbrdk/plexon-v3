import { NextResponse } from 'next/server';
import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { getMcpServerBySlug } from '@/lib/mcp-hub/store';
import { deleteOauthBinding, getOauthBinding, mcpHubOauthStartPath } from '@/lib/mcp-hub/oauth';

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const { slug } = await ctx.params;
  const server = await getMcpServerBySlug(slug);
  if (!server || server.authKind !== 'oauth_user') {
    return apiError('Not found', API_STATUS.NOT_FOUND);
  }
  const binding = await getOauthBinding(server.id, user.id);
  return NextResponse.json({
    slug: server.slug,
    displayName: server.displayName,
    connected: Boolean(binding),
    expiresAt: binding?.expiresAt?.toISOString() ?? null,
    scopes: binding?.scopes ?? [],
    connectUrl: mcpHubOauthStartPath(server.slug),
  });
}

export async function DELETE(request: Request, ctx: Ctx) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const { slug } = await ctx.params;
  const server = await getMcpServerBySlug(slug);
  if (!server) return apiError('Not found', API_STATUS.NOT_FOUND);
  const ok = await deleteOauthBinding(server.id, user.id);
  return NextResponse.json({ ok, disconnected: ok });
}
