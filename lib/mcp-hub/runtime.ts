/**
 * MCP Tool Hub — discover / test / free-chat tool injection.
 * Spec: specs/domain/mcp-tool-hub.md Waves H1–H3
 */

import type { AnthropicTool } from '@/lib/checkion-mcp-client';
import {
  callCheckionMcpTool,
  listMcpToolsRaw,
  probeMcpServer,
} from '@/lib/checkion-mcp-client';
import { resolveMcpHubAuthHeaders } from '@/lib/mcp-hub/naming';
import type { HubRoutingHintServer } from '@/lib/mcp-hub/routing-hints';
import {
  getMcpServerById,
  listActiveHubRoutingServers,
  listEnabledHubTools,
  patchMcpServer,
  upsertDiscoveredTools,
  type McpServerRow,
} from '@/lib/mcp-hub/store';
import { runtimeEnv } from '@/lib/runtime-env';
import { publicAppBaseUrl } from '@/lib/mcp-hub/oauth';
import { callCanvaMcpToolInProcess } from '@/lib/mcp-hub/canva-mcp-handler';

export type HubToolCallTarget = {
  baseUrl: string;
  mcpName: string;
  extraHeaders: Record<string, string>;
  sideEffect: string;
  requireConfirm: boolean;
  authKind: string;
  serverSlug: string;
};

const hubAllowlist = new Set<string>();
const hubWriteTools = new Set<string>();
const hubConfirmTools = new Set<string>();
const hubCallTargets = new Map<string, HubToolCallTarget>();

let routingHintsCache: { expiresAt: number; servers: HubRoutingHintServer[] } | null = null;
const ROUTING_HINTS_TTL_MS = 60_000;

/**
 * Same-app Canva MCP must not be fetched via public FQDN (Coolify hairpin → network error).
 * Prefer loopback for discover/test; tools/call uses in-process path.
 */
export function resolveHubFetchBaseUrl(server: Pick<McpServerRow, 'slug' | 'baseUrl'>): string {
  const base = server.baseUrl.replace(/\/$/, '');
  const isCanvaPath =
    server.slug === 'canva' || /\/api\/platform\/mcp-hub\/canva$/i.test(base);
  if (!isCanvaPath) return server.baseUrl;
  const app = publicAppBaseUrl().replace(/\/$/, '');
  if (app && (base === `${app}/api/platform/mcp-hub/canva` || base.startsWith(app))) {
    const port = runtimeEnv('PORT') || '3000';
    return `http://127.0.0.1:${port}/api/platform/mcp-hub/canva`;
  }
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(base)) {
    return base;
  }
  // Registered as public staging URL without matching NEXTAUTH_URL — still loopback.
  if (server.slug === 'canva') {
    const port = runtimeEnv('PORT') || '3000';
    return `http://127.0.0.1:${port}/api/platform/mcp-hub/canva`;
  }
  return server.baseUrl;
}

export function isHubAllowlistedTool(name: string): boolean {
  return hubAllowlist.has(name);
}

export function isHubWriteTool(name: string): boolean {
  return hubWriteTools.has(name);
}

export function isHubConfirmRequiredTool(name: string): boolean {
  return hubConfirmTools.has(name);
}

export function getHubToolCallTarget(exposedName: string): HubToolCallTarget | undefined {
  return hubCallTargets.get(exposedName);
}

export function clearHubToolRuntimeState(): void {
  hubAllowlist.clear();
  hubWriteTools.clear();
  hubConfirmTools.clear();
  hubCallTargets.clear();
}

/** Test-only: seed allowlist without DB. */
export function __setHubToolAllowlistForTests(
  names: string[],
  options?: { writeNames?: string[]; confirmNames?: string[] }
): void {
  clearHubToolRuntimeState();
  for (const n of names) hubAllowlist.add(n);
  for (const n of options?.writeNames ?? []) {
    hubAllowlist.add(n);
    hubWriteTools.add(n);
  }
  for (const n of options?.confirmNames ?? []) {
    hubAllowlist.add(n);
    hubConfirmTools.add(n);
  }
}

export function invalidateHubRoutingHintsCache(): void {
  routingHintsCache = null;
}

export async function getCachedHubRoutingServers(): Promise<HubRoutingHintServer[]> {
  if (routingHintsCache && routingHintsCache.expiresAt > Date.now()) {
    return routingHintsCache.servers;
  }
  try {
    const servers = await listActiveHubRoutingServers();
    routingHintsCache = {
      expiresAt: Date.now() + ROUTING_HINTS_TTL_MS,
      servers,
    };
    return servers;
  } catch {
    return routingHintsCache?.servers ?? [];
  }
}

function authHeadersForServer(
  server: McpServerRow,
  actorUserId?: string | null
): {
  headers: Record<string, string>;
  error?: string;
} {
  const base = resolveMcpHubAuthHeaders(server.authKind, server.authConfig);
  if (base.error) return base;
  if (server.authKind === 'oauth_user') {
    const secret = runtimeEnv('PLEXON_SERVICE_SECRET');
    if (!secret) {
      return { headers: {}, error: 'PLEXON_SERVICE_SECRET required for oauth_user Hub calls' };
    }
    if (!actorUserId?.trim()) {
      // Discover/Admin may omit actor — tools/list still works on Canva MCP.
      return {
        headers: {
          ...base.headers,
          'X-Plexon-Service-Secret': secret,
        },
      };
    }
    return {
      headers: {
        ...base.headers,
        'X-Plexon-Service-Secret': secret,
        'X-Plexon-User-Id': actorUserId.trim(),
      },
    };
  }
  return base;
}

export async function testMcpHubServer(serverId: string): Promise<{
  ok: boolean;
  error?: string;
  sessionId?: string | null;
}> {
  const server = await getMcpServerById(serverId);
  if (!server) return { ok: false, error: 'not_found' };
  const auth = authHeadersForServer(server);
  if (auth.error) {
    await patchMcpServer(serverId, {
      status: server.status === 'active' ? 'error' : server.status,
      lastError: auth.error,
    });
    return { ok: false, error: auth.error };
  }
  const probe = await probeMcpServer(resolveHubFetchBaseUrl(server), {
    extraHeaders: auth.headers,
  });
  if (!probe.ok) {
    await patchMcpServer(serverId, {
      lastError: probe.error,
      status: server.status === 'active' ? 'error' : server.status,
    });
    return { ok: false, error: probe.error };
  }
  await patchMcpServer(serverId, { lastError: null });
  return { ok: true, sessionId: probe.sessionId };
}

export async function discoverMcpHubServer(serverId: string): Promise<{
  ok: boolean;
  upserted?: number;
  error?: string;
}> {
  const server = await getMcpServerById(serverId);
  if (!server) return { ok: false, error: 'not_found' };
  const auth = authHeadersForServer(server);
  if (auth.error) {
    await patchMcpServer(serverId, { lastError: auth.error });
    return { ok: false, error: auth.error };
  }
  try {
    const tools = await listMcpToolsRaw(resolveHubFetchBaseUrl(server), {
      extraHeaders: auth.headers,
    });
    const { upserted } = await upsertDiscoveredTools(server, tools);
    await patchMcpServer(serverId, {
      lastDiscoveryAt: new Date(),
      lastError: null,
      status: server.status === 'error' ? 'draft' : server.status,
    });
    invalidateHubRoutingHintsCache();
    return { ok: true, upserted };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await patchMcpServer(serverId, { lastError: message });
    return { ok: false, error: message };
  }
}

/**
 * Load enabled Hub tools for a free-chat turn.
 * Reads always; write/destructive only when allowWriteTools.
 */
export async function loadHubToolsForTurn(options?: {
  allowWriteTools?: boolean;
  actorUserId?: string | null;
  platformProjectId?: string | null;
}): Promise<{
  tools: AnthropicTool[];
  mcpNameByAnthropicName: Record<string, string>;
  toolSourceByAnthropicName: Record<string, string>;
  exposedNames: string[];
}> {
  clearHubToolRuntimeState();
  const allowWrite = Boolean(options?.allowWriteTools);
  const sideEffects = allowWrite
    ? (['read', 'write', 'destructive'] as const)
    : (['read'] as const);
  const rows = await listEnabledHubTools({
    sideEffects: [...sideEffects],
    platformProjectId: options?.platformProjectId,
  });
  // Warm Hub→catalog bridge cache for Agent adapter.
  void import('@/lib/mcp-hub/catalog-bridge').then((m) => m.getHubExposedCapabilityMap());
  const tools: AnthropicTool[] = [];
  const mcpNameByAnthropicName: Record<string, string> = {};
  const toolSourceByAnthropicName: Record<string, string> = {};
  const exposedNames: string[] = [];

  for (const row of rows) {
    const auth = authHeadersForServer(row.server, options?.actorUserId);
    if (auth.error && row.server.authKind !== 'oauth_user') continue;
    if (auth.error && row.server.authKind === 'oauth_user') continue;

    const schema = row.inputSchema ?? {};
    const properties =
      schema.properties && typeof schema.properties === 'object'
        ? (schema.properties as AnthropicTool['input_schema']['properties'])
        : undefined;
    const required = Array.isArray(schema.required) ? (schema.required as string[]) : [];

    const sideTag =
      row.sideEffect === 'read' ? 'read' : row.sideEffect === 'destructive' ? 'destructive' : 'write';
    tools.push({
      name: row.exposedName,
      description: `[Hub:${row.server.slug}|${sideTag}] ${row.description || row.mcpName}`,
      input_schema: {
        type: 'object',
        properties,
        required,
      },
    });
    mcpNameByAnthropicName[row.exposedName] = row.mcpName;
    toolSourceByAnthropicName[row.exposedName] = row.server.baseUrl;
    hubAllowlist.add(row.exposedName);
    if (row.sideEffect === 'write' || row.sideEffect === 'destructive') {
      hubWriteTools.add(row.exposedName);
    }
    if (row.requireConfirm || row.sideEffect === 'destructive') {
      hubConfirmTools.add(row.exposedName);
    }
    hubCallTargets.set(row.exposedName, {
      baseUrl: resolveHubFetchBaseUrl(row.server),
      mcpName: row.mcpName,
      extraHeaders: auth.headers,
      sideEffect: row.sideEffect,
      requireConfirm: row.requireConfirm,
      authKind: row.server.authKind,
      serverSlug: row.server.slug,
    });
    exposedNames.push(row.exposedName);
  }

  return { tools, mcpNameByAnthropicName, toolSourceByAnthropicName, exposedNames };
}

/** @deprecated Use loadHubToolsForTurn — kept for H1 call sites. */
export async function loadHubReadToolsForTurn(): Promise<{
  tools: AnthropicTool[];
  mcpNameByAnthropicName: Record<string, string>;
  toolSourceByAnthropicName: Record<string, string>;
  exposedNames: string[];
}> {
  return loadHubToolsForTurn({ allowWriteTools: false });
}

export async function callHubMcpTool(
  exposedName: string,
  args: Record<string, unknown>
): Promise<string> {
  const target = getHubToolCallTarget(exposedName);
  if (!target) {
    return JSON.stringify({ error: `Unknown Hub tool ${exposedName}` });
  }
  if (target.serverSlug === 'canva') {
    return callCanvaMcpToolInProcess(target.mcpName, args, target.extraHeaders);
  }
  return callCheckionMcpTool(target.baseUrl, target.mcpName, args, {
    extraHeaders: target.extraHeaders,
  });
}
