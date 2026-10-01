import { NextResponse } from 'next/server';
import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getRequestUser } from '@/lib/auth-request-user';
import { getMcpServerBySlug } from '@/lib/mcp-hub/store';
import {
  buildAuthorizeUrl,
  createOauthPending,
  createPkcePair,
  mcpHubOauthCallbackUrl,
  purgeExpiredOauthPending,
  resolveOauthAppConfig,
} from '@/lib/mcp-hub/oauth';
import { hubTokenEncryptionConfigured } from '@/lib/mcp-hub/token-crypto';

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const user = await getRequestUser(request);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  if (!process.env.DATABASE_URL) return apiError('Database not configured', 503);
  if (!hubTokenEncryptionConfigured()) {
    return apiError('MCP_HUB_TOKEN_ENCRYPTION_KEY not configured', 503);
  }
  const { slug } = await ctx.params;
  const server = await getMcpServerBySlug(slug);
  if (!server || server.authKind !== 'oauth_user') {
    return apiError('OAuth server not found', API_STATUS.NOT_FOUND);
  }
  if (server.status !== 'active' && server.status !== 'draft') {
    return apiError('Server not enabled', API_STATUS.BAD_REQUEST);
  }
  const app = resolveOauthAppConfig(server);
  if (app.error) return apiError(app.error, API_STATUS.BAD_REQUEST);

  const url = new URL(request.url);
  const returnPath = url.searchParams.get('return') || '/settings';
  const { verifier, challenge } = createPkcePair();
  await purgeExpiredOauthPending();
  const state = await createOauthPending({
    serverId: server.id,
    userId: user.id,
    codeVerifier: verifier,
    returnPath,
  });
  const authorizeUrl = buildAuthorizeUrl({
    authorizeUrl: app.authorizeUrl,
    clientId: app.clientId,
    redirectUri: mcpHubOauthCallbackUrl(server.slug),
    scopes: app.scopes,
    state,
    codeChallenge: challenge,
  });
  return NextResponse.redirect(authorizeUrl);
}
