/**
 * MCP Hub OAuth (PKCE) + bindings.
 * Spec: specs/domain/mcp-hub-canva.md
 */

import { createHash, randomBytes } from 'crypto';
import { and, eq, lt } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import {
  mcpOauthBindings,
  mcpOauthPending,
  type McpServerAuthConfig,
} from '@/lib/db/schema';
import { runtimeEnv } from '@/lib/runtime-env';
import { decryptHubSecret, encryptHubSecret } from '@/lib/mcp-hub/token-crypto';
import type { McpServerRow } from '@/lib/mcp-hub/store';

export const CANVA_DEFAULT_SCOPES = [
  'design:meta:read',
  'design:content:read',
  'design:content:write',
  'brandtemplate:meta:read',
  'brandtemplate:content:read',
  'asset:read',
  'asset:write',
] as const;

export const CANVA_AUTHORIZE_URL = 'https://www.canva.com/api/oauth/authorize';
export const CANVA_TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token';

export type McpOauthBindingRow = typeof mcpOauthBindings.$inferSelect;

function base64url(buf: Buffer): string {
  return buf.toString('base64url');
}

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export function resolveOauthAppConfig(server: McpServerRow): {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  error?: string;
} {
  const cfg = (server.authConfig ?? {}) as McpServerAuthConfig;
  const idKey = cfg.oauthClientIdEnvKey?.trim() || 'CANVA_CLIENT_ID';
  const secretKey = cfg.oauthClientSecretEnvKey?.trim() || 'CANVA_CLIENT_SECRET';
  const clientId = runtimeEnv(idKey);
  const clientSecret = runtimeEnv(secretKey);
  if (!clientId || !clientSecret) {
    return {
      clientId: '',
      clientSecret: '',
      authorizeUrl: cfg.oauthAuthorizeUrl || CANVA_AUTHORIZE_URL,
      tokenUrl: cfg.oauthTokenUrl || CANVA_TOKEN_URL,
      scopes: cfg.oauthScopes?.length ? cfg.oauthScopes : [...CANVA_DEFAULT_SCOPES],
      error: `Missing env ${idKey} / ${secretKey}`,
    };
  }
  return {
    clientId,
    clientSecret,
    authorizeUrl: cfg.oauthAuthorizeUrl?.trim() || CANVA_AUTHORIZE_URL,
    tokenUrl: cfg.oauthTokenUrl?.trim() || CANVA_TOKEN_URL,
    scopes: cfg.oauthScopes?.length ? cfg.oauthScopes.map(String) : [...CANVA_DEFAULT_SCOPES],
  };
}

export function publicAppBaseUrl(): string {
  return (runtimeEnv('NEXTAUTH_URL') || runtimeEnv('PUBLIC_APP_URL')).replace(/\/$/, '');
}

export function mcpHubOauthCallbackUrl(slug: string): string {
  return `${publicAppBaseUrl()}/api/platform/mcp-hub/oauth/${encodeURIComponent(slug)}/callback`;
}

export function mcpHubOauthStartPath(slug: string): string {
  return `/api/platform/mcp-hub/oauth/${encodeURIComponent(slug)}/start`;
}

export async function createOauthPending(input: {
  serverId: string;
  userId: string;
  codeVerifier: string;
  returnPath?: string | null;
}): Promise<string> {
  const db = getDb();
  const state = base64url(randomBytes(24));
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await db.insert(mcpOauthPending).values({
    state,
    serverId: input.serverId,
    userId: input.userId,
    codeVerifier: input.codeVerifier,
    returnPath: input.returnPath ?? null,
    expiresAt,
  });
  return state;
}

export async function consumeOauthPending(state: string): Promise<{
  serverId: string;
  userId: string;
  codeVerifier: string;
  returnPath: string | null;
} | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(mcpOauthPending)
    .where(eq(mcpOauthPending.state, state))
    .limit(1);
  if (!row) return null;
  await db.delete(mcpOauthPending).where(eq(mcpOauthPending.state, state));
  if (row.expiresAt.getTime() < Date.now()) return null;
  return {
    serverId: row.serverId,
    userId: row.userId,
    codeVerifier: row.codeVerifier,
    returnPath: row.returnPath,
  };
}

export async function purgeExpiredOauthPending(): Promise<void> {
  const db = getDb();
  await db.delete(mcpOauthPending).where(lt(mcpOauthPending.expiresAt, new Date()));
}

export async function getOauthBinding(
  serverId: string,
  userId: string
): Promise<McpOauthBindingRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(mcpOauthBindings)
    .where(and(eq(mcpOauthBindings.serverId, serverId), eq(mcpOauthBindings.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function deleteOauthBinding(serverId: string, userId: string): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(mcpOauthBindings)
    .where(and(eq(mcpOauthBindings.serverId, serverId), eq(mcpOauthBindings.userId, userId)))
    .returning({ id: mcpOauthBindings.id });
  return deleted.length > 0;
}

export async function upsertOauthBinding(input: {
  serverId: string;
  userId: string;
  companyId?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  expiresIn?: number | null;
  scopes: string[];
}): Promise<McpOauthBindingRow> {
  const db = getDb();
  const now = new Date();
  const expiresAt =
    typeof input.expiresIn === 'number' && input.expiresIn > 0
      ? new Date(now.getTime() + input.expiresIn * 1000)
      : null;
  const existing = await getOauthBinding(input.serverId, input.userId);
  const accessTokenEnc = encryptHubSecret(input.accessToken);
  const refreshTokenEnc = input.refreshToken ? encryptHubSecret(input.refreshToken) : null;
  if (existing) {
    await db
      .update(mcpOauthBindings)
      .set({
        accessTokenEnc,
        refreshTokenEnc: refreshTokenEnc ?? existing.refreshTokenEnc,
        expiresAt,
        scopes: input.scopes,
        companyId: input.companyId ?? existing.companyId,
        updatedAt: now,
      })
      .where(eq(mcpOauthBindings.id, existing.id));
    const [row] = await db
      .select()
      .from(mcpOauthBindings)
      .where(eq(mcpOauthBindings.id, existing.id))
      .limit(1);
    return row!;
  }
  const id = base64url(randomBytes(16));
  const row: McpOauthBindingRow = {
    id,
    serverId: input.serverId,
    userId: input.userId,
    companyId: input.companyId ?? null,
    accessTokenEnc,
    refreshTokenEnc,
    expiresAt,
    scopes: input.scopes,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(mcpOauthBindings).values(row);
  return row;
}

export type OauthTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

export async function exchangeAuthorizationCode(input: {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<OauthTokenResponse> {
  const basic = Buffer.from(`${input.clientId}:${input.clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code_verifier: input.codeVerifier,
    code: input.code,
    redirect_uri: input.redirectUri,
  });
  const res = await fetch(input.tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as OauthTokenResponse & {
    error?: string;
    message?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(json.message || json.error || `token exchange HTTP ${res.status}`);
  }
  return json;
}

export async function refreshAccessToken(input: {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<OauthTokenResponse> {
  const basic = Buffer.from(`${input.clientId}:${input.clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: input.refreshToken,
  });
  const res = await fetch(input.tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as OauthTokenResponse & {
    error?: string;
    message?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(json.message || json.error || `token refresh HTTP ${res.status}`);
  }
  return json;
}

/** Decrypt access token; refresh if expired when possible. */
export async function resolveUserAccessToken(
  server: McpServerRow,
  userId: string
): Promise<{ accessToken: string } | { error: 'oauth_required' | string; connectUrl?: string }> {
  const binding = await getOauthBinding(server.id, userId);
  if (!binding) {
    return {
      error: 'oauth_required',
      connectUrl: mcpHubOauthStartPath(server.slug),
    };
  }
  const app = resolveOauthAppConfig(server);
  if (app.error) return { error: app.error };

  const needsRefresh =
    binding.expiresAt != null && binding.expiresAt.getTime() < Date.now() + 60_000;
  if (!needsRefresh) {
    try {
      return { accessToken: decryptHubSecret(binding.accessTokenEnc) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'decrypt_failed' };
    }
  }
  if (!binding.refreshTokenEnc) {
    return {
      error: 'oauth_required',
      connectUrl: mcpHubOauthStartPath(server.slug),
    };
  }
  try {
    const refreshToken = decryptHubSecret(binding.refreshTokenEnc);
    const tokens = await refreshAccessToken({
      tokenUrl: app.tokenUrl,
      clientId: app.clientId,
      clientSecret: app.clientSecret,
      refreshToken,
    });
    await upsertOauthBinding({
      serverId: server.id,
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? refreshToken,
      expiresIn: tokens.expires_in ?? null,
      scopes: tokens.scope ? tokens.scope.split(/\s+/).filter(Boolean) : binding.scopes,
    });
    return { accessToken: tokens.access_token };
  } catch {
    return {
      error: 'oauth_required',
      connectUrl: mcpHubOauthStartPath(server.slug),
    };
  }
}

export function buildAuthorizeUrl(input: {
  authorizeUrl: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  codeChallenge: string;
}): string {
  const u = new URL(input.authorizeUrl);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', input.clientId);
  u.searchParams.set('redirect_uri', input.redirectUri);
  u.searchParams.set('scope', input.scopes.join(' '));
  u.searchParams.set('state', input.state);
  u.searchParams.set('code_challenge', input.codeChallenge);
  u.searchParams.set('code_challenge_method', 's256');
  return u.toString();
}
