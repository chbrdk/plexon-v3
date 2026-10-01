import { NextResponse } from 'next/server';
import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { getMcpServerById, getMcpServerBySlug } from '@/lib/mcp-hub/store';
import {
  consumeOauthPending,
  exchangeAuthorizationCode,
  mcpHubOauthCallbackUrl,
  resolveOauthAppConfig,
  upsertOauthBinding,
} from '@/lib/mcp-hub/oauth';

function safeReturnPath(raw: string | null | undefined): string {
  if (!raw) return '/settings';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/settings';
  return raw.slice(0, 200);
}

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  const { slug } = await ctx.params;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/settings?mcp_oauth=error&reason=${encodeURIComponent(oauthError)}`, url.origin)
    );
  }
  if (!code || !state) {
    return apiError('Missing code/state', API_STATUS.BAD_REQUEST);
  }

  const pending = await consumeOauthPending(state);
  if (!pending || pending.userId !== user.id) {
    return NextResponse.redirect(new URL('/settings?mcp_oauth=invalid_state', url.origin));
  }

  const server =
    (await getMcpServerById(pending.serverId)) || (await getMcpServerBySlug(slug));
  if (!server || server.slug !== slug) {
    return NextResponse.redirect(new URL('/settings?mcp_oauth=server_mismatch', url.origin));
  }

  const app = resolveOauthAppConfig(server);
  if (app.error) {
    return NextResponse.redirect(
      new URL(`/settings?mcp_oauth=error&reason=${encodeURIComponent(app.error)}`, url.origin)
    );
  }

  try {
    const tokens = await exchangeAuthorizationCode({
      tokenUrl: app.tokenUrl,
      clientId: app.clientId,
      clientSecret: app.clientSecret,
      code,
      codeVerifier: pending.codeVerifier,
      redirectUri: mcpHubOauthCallbackUrl(server.slug),
    });
    await upsertOauthBinding({
      serverId: server.id,
      userId: user.id,
      companyId: null,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresIn: tokens.expires_in ?? null,
      scopes: tokens.scope
        ? tokens.scope.split(/\s+/).filter(Boolean)
        : app.scopes,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'token_failed';
    return NextResponse.redirect(
      new URL(`/settings?mcp_oauth=error&reason=${encodeURIComponent(msg)}`, url.origin)
    );
  }

  const dest = safeReturnPath(pending.returnPath);
  const sep = dest.includes('?') ? '&' : '?';
  return NextResponse.redirect(new URL(`${dest}${sep}mcp_oauth=connected&slug=${slug}`, url.origin));
}
