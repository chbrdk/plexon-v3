/**
 * MCP Tool Hub — Postgres accessors.
 * Spec: specs/domain/mcp-tool-hub.md
 */

import { and, asc, eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { getDb } from '@/lib/db';
import {
  mcpServerTools,
  mcpServers,
  mcpToolPolicies,
  type McpServerAuthConfig,
  type McpServerAuthKind,
  type McpServerSource,
  type McpServerStatus,
  type McpToolSideEffect,
} from '@/lib/db/schema';
import {
  hubExposedToolName,
  inferMcpToolSideEffect,
  isValidMcpServerSlug,
  normalizeMcpServerSlug,
  redactMcpServerAuthConfig,
} from '@/lib/mcp-hub/naming';
import type { McpTool } from '@/lib/checkion-mcp-client';

export type McpServerRow = typeof mcpServers.$inferSelect;
export type McpServerToolRow = typeof mcpServerTools.$inferSelect;

export type McpServerPublic = Omit<McpServerRow, 'authConfig'> & {
  authConfig: McpServerAuthConfig;
  toolCount?: number;
};

export function toPublicMcpServer(row: McpServerRow, toolCount?: number): McpServerPublic {
  return {
    ...row,
    authConfig: redactMcpServerAuthConfig(row.authConfig),
    ...(toolCount != null ? { toolCount } : {}),
  };
}

export async function listMcpServers(): Promise<McpServerPublic[]> {
  const db = getDb();
  const rows = await db.select().from(mcpServers).orderBy(asc(mcpServers.slug));
  const tools = await db
    .select({ serverId: mcpServerTools.serverId })
    .from(mcpServerTools);
  const counts = new Map<string, number>();
  for (const t of tools) {
    counts.set(t.serverId, (counts.get(t.serverId) ?? 0) + 1);
  }
  return rows.map((r) => toPublicMcpServer(r, counts.get(r.id) ?? 0));
}

export async function getMcpServerById(id: string): Promise<McpServerRow | null> {
  const db = getDb();
  const [row] = await db.select().from(mcpServers).where(eq(mcpServers.id, id)).limit(1);
  return row ?? null;
}

export async function getMcpServerBySlug(slug: string): Promise<McpServerRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(mcpServers)
    .where(eq(mcpServers.slug, normalizeMcpServerSlug(slug)))
    .limit(1);
  return row ?? null;
}

export async function listActiveMcpServers(): Promise<McpServerRow[]> {
  const db = getDb();
  return db.select().from(mcpServers).where(eq(mcpServers.status, 'active'));
}

export type CreateMcpServerInput = {
  slug: string;
  displayName: string;
  baseUrl: string;
  authKind?: McpServerAuthKind | string;
  authConfig?: McpServerAuthConfig;
  status?: McpServerStatus | string;
  source?: McpServerSource | string;
  productId?: string | null;
  routingHints?: string[];
};

export async function createMcpServer(input: CreateMcpServerInput): Promise<McpServerRow> {
  const slug = normalizeMcpServerSlug(input.slug);
  if (!isValidMcpServerSlug(slug)) {
    throw new Error('Invalid slug (use lowercase letters, digits, hyphens; 2–63 chars)');
  }
  const baseUrl = input.baseUrl.trim().replace(/\/$/, '');
  if (!/^https?:\/\//i.test(baseUrl)) {
    throw new Error('baseUrl must be http(s)');
  }
  const db = getDb();
  const id = randomUUID();
  const now = new Date();
  const row: McpServerRow = {
    id,
    slug,
    displayName: input.displayName.trim() || slug,
    baseUrl,
    transport: 'streamable_http',
    authKind: (input.authKind as string) || 'none',
    authConfig: input.authConfig ?? {},
    status: (input.status as string) || 'draft',
    source: (input.source as string) || 'manual',
    productId: input.productId?.trim() || null,
    routingHints: Array.isArray(input.routingHints) ? input.routingHints.map(String) : [],
    lastDiscoveryAt: null,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(mcpServers).values(row);
  return row;
}

export type PatchMcpServerInput = Partial<{
  displayName: string;
  baseUrl: string;
  authKind: string;
  authConfig: McpServerAuthConfig;
  status: string;
  productId: string | null;
  routingHints: string[];
  lastError: string | null;
  lastDiscoveryAt: Date | null;
}>;

export async function patchMcpServer(
  id: string,
  patch: PatchMcpServerInput
): Promise<McpServerRow | null> {
  const existing = await getMcpServerById(id);
  if (!existing) return null;
  const db = getDb();
  const next: Partial<McpServerRow> = { updatedAt: new Date() };
  if (patch.displayName != null) next.displayName = patch.displayName.trim();
  if (patch.baseUrl != null) {
    const baseUrl = patch.baseUrl.trim().replace(/\/$/, '');
    if (!/^https?:\/\//i.test(baseUrl)) throw new Error('baseUrl must be http(s)');
    next.baseUrl = baseUrl;
  }
  if (patch.authKind != null) next.authKind = patch.authKind;
  if (patch.authConfig != null) next.authConfig = patch.authConfig;
  if (patch.status != null) next.status = patch.status;
  if (patch.productId !== undefined) next.productId = patch.productId?.trim() || null;
  if (patch.routingHints != null) next.routingHints = patch.routingHints.map(String);
  if (patch.lastError !== undefined) next.lastError = patch.lastError;
  if (patch.lastDiscoveryAt !== undefined) next.lastDiscoveryAt = patch.lastDiscoveryAt;
  await db.update(mcpServers).set(next).where(eq(mcpServers.id, id));
  return getMcpServerById(id);
}

export async function deleteMcpServer(id: string): Promise<boolean> {
  const db = getDb();
  const deleted = await db.delete(mcpServers).where(eq(mcpServers.id, id)).returning({ id: mcpServers.id });
  return deleted.length > 0;
}

export async function listMcpServerTools(serverId: string): Promise<McpServerToolRow[]> {
  const db = getDb();
  return db
    .select()
    .from(mcpServerTools)
    .where(eq(mcpServerTools.serverId, serverId))
    .orderBy(asc(mcpServerTools.exposedName));
}

export async function listEnabledReadHubTools(): Promise<
  Array<McpServerToolRow & { server: McpServerRow }>
> {
  return listEnabledHubTools({ sideEffects: ['read'] });
}

export async function listEnabledHubTools(options?: {
  sideEffects?: Array<McpToolSideEffect | string>;
}): Promise<Array<McpServerToolRow & { server: McpServerRow }>> {
  const servers = await listActiveMcpServers();
  if (!servers.length) return [];
  const allowedSide =
    options?.sideEffects && options.sideEffects.length
      ? new Set(options.sideEffects)
      : null;
  const db = getDb();
  const policies = await db.select().from(mcpToolPolicies);
  const deniedServers = new Set(
    policies.filter((p) => p.effect === 'deny' && !p.toolId).map((p) => p.serverId)
  );
  const deniedTools = new Set(
    policies.filter((p) => p.effect === 'deny' && p.toolId).map((p) => p.toolId as string)
  );
  const writeBlockedServers = new Set(
    policies.filter((p) => !p.allowWrite && !p.toolId).map((p) => p.serverId)
  );
  const writeBlockedTools = new Set(
    policies.filter((p) => !p.allowWrite && p.toolId).map((p) => p.toolId as string)
  );

  const out: Array<McpServerToolRow & { server: McpServerRow }> = [];
  for (const server of servers) {
    if (deniedServers.has(server.id)) continue;
    const tools = await db
      .select()
      .from(mcpServerTools)
      .where(and(eq(mcpServerTools.serverId, server.id), eq(mcpServerTools.enabled, true)));
    for (const tool of tools) {
      if (deniedTools.has(tool.id)) continue;
      if (allowedSide && !allowedSide.has(tool.sideEffect)) continue;
      if (
        (tool.sideEffect === 'write' || tool.sideEffect === 'destructive') &&
        (writeBlockedServers.has(server.id) || writeBlockedTools.has(tool.id))
      ) {
        continue;
      }
      out.push({ ...tool, server });
    }
  }
  return out;
}

export type McpPolicyRow = typeof mcpToolPolicies.$inferSelect;

export async function listMcpPoliciesForServer(serverId: string): Promise<McpPolicyRow[]> {
  const db = getDb();
  return db.select().from(mcpToolPolicies).where(eq(mcpToolPolicies.serverId, serverId));
}

/** Org-scope server-wide policy upsert (toolId null). */
export async function upsertOrgServerPolicy(input: {
  serverId: string;
  effect: 'allow' | 'deny';
  allowWrite: boolean;
}): Promise<McpPolicyRow> {
  const db = getDb();
  const existing = await db
    .select()
    .from(mcpToolPolicies)
    .where(
      and(
        eq(mcpToolPolicies.serverId, input.serverId),
        eq(mcpToolPolicies.scope, 'org')
      )
    );
  const serverWide = existing.find((p) => !p.toolId);
  const now = new Date();
  if (serverWide) {
    await db
      .update(mcpToolPolicies)
      .set({
        effect: input.effect,
        allowWrite: input.allowWrite,
        updatedAt: now,
      })
      .where(eq(mcpToolPolicies.id, serverWide.id));
    const [row] = await db
      .select()
      .from(mcpToolPolicies)
      .where(eq(mcpToolPolicies.id, serverWide.id))
      .limit(1);
    return row!;
  }
  const row: McpPolicyRow = {
    id: randomUUID(),
    scope: 'org',
    scopeId: null,
    serverId: input.serverId,
    toolId: null,
    effect: input.effect,
    allowWrite: input.allowWrite,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(mcpToolPolicies).values(row);
  return row;
}

export async function listActiveHubRoutingServers(): Promise<
  Array<{ slug: string; displayName: string; routingHints: string[] }>
> {
  const servers = await listActiveMcpServers();
  return servers.map((s) => ({
    slug: s.slug,
    displayName: s.displayName,
    routingHints: Array.isArray(s.routingHints) ? s.routingHints : [],
  }));
}

/** Idempotent env bootstrap for AUDION MCP (Wave H2). */
export async function ensureAudionEnvBootstrapServer(): Promise<McpServerRow | null> {
  const baseUrl = process.env.AUDION_MCP_URL?.trim().replace(/\/$/, '');
  if (!baseUrl) return null;
  const existing = await getMcpServerBySlug('audion');
  if (existing) return existing;
  try {
    return await createMcpServer({
      slug: 'audion',
      displayName: 'AUDION MCP',
      baseUrl,
      authKind: 'none',
      authConfig: {},
      status: 'draft',
      source: 'env_bootstrap',
      productId: 'audion',
      routingHints: ['persona', 'zielgruppe', 'audion', 'journey'],
    });
  } catch {
    return getMcpServerBySlug('audion');
  }
}


export async function upsertDiscoveredTools(
  server: McpServerRow,
  tools: McpTool[]
): Promise<{ upserted: number }> {
  const db = getDb();
  const now = new Date();
  let upserted = 0;
  for (const tool of tools) {
    const mcpName = String(tool.name ?? '').trim();
    if (!mcpName) continue;
    const exposedName = hubExposedToolName(server.slug, mcpName);
    const sideEffect = inferMcpToolSideEffect(mcpName, tool.description);
    const inputSchema =
      tool.inputSchema && typeof tool.inputSchema === 'object'
        ? (tool.inputSchema as Record<string, unknown>)
        : {};
    const existing = await db
      .select()
      .from(mcpServerTools)
      .where(and(eq(mcpServerTools.serverId, server.id), eq(mcpServerTools.mcpName, mcpName)))
      .limit(1);
    if (existing[0]) {
      await db
        .update(mcpServerTools)
        .set({
          exposedName,
          description: typeof tool.description === 'string' ? tool.description : existing[0].description,
          inputSchema,
          // Keep Admin overrides for sideEffect / enabled / requireConfirm
          updatedAt: now,
        })
        .where(eq(mcpServerTools.id, existing[0].id));
    } else {
      await db.insert(mcpServerTools).values({
        id: randomUUID(),
        serverId: server.id,
        mcpName,
        exposedName,
        description: typeof tool.description === 'string' ? tool.description : null,
        inputSchema,
        sideEffect,
        requireConfirm: sideEffect !== 'read',
        capabilityId: null,
        enabled: true,
        updatedAt: now,
      });
    }
    upserted += 1;
  }
  return { upserted };
}

export async function patchMcpServerTool(
  toolId: string,
  patch: Partial<{
    enabled: boolean;
    sideEffect: McpToolSideEffect | string;
    requireConfirm: boolean;
    description: string | null;
  }>
): Promise<McpServerToolRow | null> {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(mcpServerTools)
    .where(eq(mcpServerTools.id, toolId))
    .limit(1);
  if (!existing) return null;
  const next: Partial<McpServerToolRow> = { updatedAt: new Date() };
  if (patch.enabled != null) next.enabled = patch.enabled;
  if (patch.sideEffect != null) next.sideEffect = patch.sideEffect;
  if (patch.requireConfirm != null) next.requireConfirm = patch.requireConfirm;
  if (patch.description !== undefined) next.description = patch.description;
  await db.update(mcpServerTools).set(next).where(eq(mcpServerTools.id, toolId));
  const [row] = await db.select().from(mcpServerTools).where(eq(mcpServerTools.id, toolId)).limit(1);
  return row ?? null;
}
