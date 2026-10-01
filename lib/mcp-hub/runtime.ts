/**
 * MCP Tool Hub — discover / test / free-chat read injection.
 * Spec: specs/domain/mcp-tool-hub.md Wave H1
 */

import type { AnthropicTool } from '@/lib/checkion-mcp-client';
import {
  callCheckionMcpTool,
  listMcpToolsRaw,
  probeMcpServer,
} from '@/lib/checkion-mcp-client';
import { resolveMcpHubAuthHeaders } from '@/lib/mcp-hub/naming';
import {
  getMcpServerById,
  listEnabledReadHubTools,
  patchMcpServer,
  upsertDiscoveredTools,
  type McpServerRow,
} from '@/lib/mcp-hub/store';

export type HubToolCallTarget = {
  baseUrl: string;
  mcpName: string;
  extraHeaders: Record<string, string>;
};

const hubAllowlist = new Set<string>();
const hubCallTargets = new Map<string, HubToolCallTarget>();

export function isHubAllowlistedTool(name: string): boolean {
  return hubAllowlist.has(name);
}

export function getHubToolCallTarget(exposedName: string): HubToolCallTarget | undefined {
  return hubCallTargets.get(exposedName);
}

export function clearHubToolRuntimeState(): void {
  hubAllowlist.clear();
  hubCallTargets.clear();
}

/** Test-only: seed allowlist without DB. */
export function __setHubToolAllowlistForTests(names: string[]): void {
  hubAllowlist.clear();
  for (const n of names) hubAllowlist.add(n);
}


function authHeadersForServer(server: McpServerRow): {
  headers: Record<string, string>;
  error?: string;
} {
  return resolveMcpHubAuthHeaders(server.authKind, server.authConfig);
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
    await patchMcpServer(serverId, { status: server.status === 'active' ? 'error' : server.status, lastError: auth.error });
    return { ok: false, error: auth.error };
  }
  const probe = await probeMcpServer(server.baseUrl, { extraHeaders: auth.headers });
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
    const tools = await listMcpToolsRaw(server.baseUrl, { extraHeaders: auth.headers });
    const { upserted } = await upsertDiscoveredTools(server, tools);
    await patchMcpServer(serverId, {
      lastDiscoveryAt: new Date(),
      lastError: null,
      status: server.status === 'error' ? 'draft' : server.status,
    });
    return { ok: true, upserted };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await patchMcpServer(serverId, { lastError: message });
    return { ok: false, error: message };
  }
}

/**
 * Load enabled Hub **read** tools for a free-chat turn.
 * Registers allowlist + call targets for the duration of the turn (clear in finally).
 */
export async function loadHubReadToolsForTurn(): Promise<{
  tools: AnthropicTool[];
  mcpNameByAnthropicName: Record<string, string>;
  toolSourceByAnthropicName: Record<string, string>;
  exposedNames: string[];
}> {
  clearHubToolRuntimeState();
  const rows = await listEnabledReadHubTools();
  const tools: AnthropicTool[] = [];
  const mcpNameByAnthropicName: Record<string, string> = {};
  const toolSourceByAnthropicName: Record<string, string> = {};
  const exposedNames: string[] = [];

  for (const row of rows) {
    const auth = authHeadersForServer(row.server);
    if (auth.error) continue;

    const schema = row.inputSchema ?? {};
    const properties =
      schema.properties && typeof schema.properties === 'object'
        ? (schema.properties as AnthropicTool['input_schema']['properties'])
        : undefined;
    const required = Array.isArray(schema.required)
      ? (schema.required as string[])
      : [];

    tools.push({
      name: row.exposedName,
      description: `[Hub:${row.server.slug}] ${row.description || row.mcpName}`,
      input_schema: {
        type: 'object',
        properties,
        required,
      },
    });
    mcpNameByAnthropicName[row.exposedName] = row.mcpName;
    toolSourceByAnthropicName[row.exposedName] = row.server.baseUrl;
    hubAllowlist.add(row.exposedName);
    hubCallTargets.set(row.exposedName, {
      baseUrl: row.server.baseUrl,
      mcpName: row.mcpName,
      extraHeaders: auth.headers,
    });
    exposedNames.push(row.exposedName);
  }

  return { tools, mcpNameByAnthropicName, toolSourceByAnthropicName, exposedNames };
}

export async function callHubMcpTool(
  exposedName: string,
  args: Record<string, unknown>
): Promise<string> {
  const target = getHubToolCallTarget(exposedName);
  if (!target) {
    return JSON.stringify({ error: `Unknown Hub tool ${exposedName}` });
  }
  return callCheckionMcpTool(target.baseUrl, target.mcpName, args, {
    extraHeaders: target.extraHeaders,
  });
}
