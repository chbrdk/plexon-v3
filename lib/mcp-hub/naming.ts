/**
 * MCP Tool Hub — naming, auth resolution, side-effect heuristics.
 * Spec: specs/domain/mcp-tool-hub.md
 */

import { toAnthropicToolName } from '@/lib/checkion-mcp-client';
import type {
  McpServerAuthConfig,
  McpServerAuthKind,
  McpToolSideEffect,
} from '@/lib/db/schema';

const SLUG_PATTERN = /^[a-z][a-z0-9-]{1,62}$/;

export function isValidMcpServerSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug.trim());
}

export function normalizeMcpServerSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

/** Anthropic-safe exposed name: `{slug}_{mcpNameNormalized}`, max 128. */
export function hubExposedToolName(slug: string, mcpName: string): string {
  const safeSlug = normalizeMcpServerSlug(slug).replace(/-/g, '_') || 'hub';
  const base = toAnthropicToolName(mcpName);
  const name = `${safeSlug}_${base}`.replace(/_+/g, '_');
  return name.slice(0, 128);
}

const WRITE_TOKEN =
  /(^|[^a-z0-9])(create|patch|update|delete|upsert|write|import|export|publish|start|run|generate|autofill)([^a-z0-9]|$)/i;

const DESTRUCTIVE_TOKEN =
  /(^|[^a-z0-9])(delete|destroy|purge|drop)([^a-z0-9]|$)/i;

export function inferMcpToolSideEffect(mcpName: string, description?: string | null): McpToolSideEffect {
  const hay = `${mcpName} ${description ?? ''}`.trim();
  if (DESTRUCTIVE_TOKEN.test(hay)) return 'destructive';
  if (WRITE_TOKEN.test(hay)) return 'write';
  return 'read';
}

/** Resolve outbound HTTP headers for an MCP Hub server (secrets from env only). */
export function resolveMcpHubAuthHeaders(
  authKind: McpServerAuthKind | string,
  authConfig: McpServerAuthConfig | null | undefined
): { headers: Record<string, string>; error?: string } {
  const cfg = authConfig ?? {};
  if (authKind === 'none' || !authKind) {
    return { headers: {} };
  }

  if (authKind === 'oauth_user') {
    // Actor + service secret are injected by Hub runtime (Wave H3).
    return { headers: {} };
  }

  const headers: Record<string, string> = {};

  if (authKind === 'service_bearer') {
    const envKey = cfg.bearerEnvKey?.trim();
    if (!envKey) {
      return { headers: {}, error: 'authConfig.bearerEnvKey required for service_bearer' };
    }
    const token = process.env[envKey]?.trim();
    if (!token) {
      return { headers: {}, error: `env ${envKey} is empty` };
    }
    headers.Authorization = `Bearer ${token}`;
  }

  if (authKind === 'service_secret_headers' || cfg.headerEnvKeys) {
    const map = cfg.headerEnvKeys ?? {};
    for (const [headerName, envKey] of Object.entries(map)) {
      if (!headerName.trim() || !envKey.trim()) continue;
      const value = process.env[envKey]?.trim();
      if (!value) {
        return { headers: {}, error: `env ${envKey} is empty (header ${headerName})` };
      }
      headers[headerName] = value;
    }
    if (authKind === 'service_secret_headers' && Object.keys(headers).length === 0 && !headers.Authorization) {
      return { headers: {}, error: 'authConfig.headerEnvKeys required for service_secret_headers' };
    }
  }

  return { headers };
}

/** Public Admin DTO — never include secret values. */
export function redactMcpServerAuthConfig(
  authConfig: McpServerAuthConfig | null | undefined
): McpServerAuthConfig {
  const cfg = authConfig ?? {};
  return {
    ...(cfg.bearerEnvKey ? { bearerEnvKey: cfg.bearerEnvKey } : {}),
    ...(cfg.headerEnvKeys ? { headerEnvKeys: { ...cfg.headerEnvKeys } } : {}),
    ...(cfg.oauthClientIdEnvKey ? { oauthClientIdEnvKey: cfg.oauthClientIdEnvKey } : {}),
    ...(cfg.oauthClientSecretEnvKey
      ? { oauthClientSecretEnvKey: cfg.oauthClientSecretEnvKey }
      : {}),
    ...(cfg.oauthAuthorizeUrl ? { oauthAuthorizeUrl: cfg.oauthAuthorizeUrl } : {}),
    ...(cfg.oauthTokenUrl ? { oauthTokenUrl: cfg.oauthTokenUrl } : {}),
    ...(cfg.oauthScopes ? { oauthScopes: [...cfg.oauthScopes] } : {}),
  };
}
