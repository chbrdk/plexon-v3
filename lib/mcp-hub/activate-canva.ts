/**
 * Activate Canva Hub for staging (bootstrap → discover → seed caps → active).
 * Spec: specs/domain/mcp-hub-staging-readiness.md
 */

import {
  ensureCanvaHubBootstrapServer,
  listMcpServerTools,
  patchMcpServer,
  patchMcpServerTool,
  toPublicMcpServer,
  type McpServerPublic,
} from '@/lib/mcp-hub/store';
import { discoverMcpHubServer, invalidateHubRoutingHintsCache } from '@/lib/mcp-hub/runtime';
import { DEFAULT_HUB_CAPABILITY_BY_EXPOSED, invalidateHubCapabilityMapCache } from '@/lib/mcp-hub/catalog-bridge';
import { canvaEnvReady } from '@/lib/mcp-hub/readiness';

export async function activateCanvaHubForStaging(): Promise<{
  ok: boolean;
  item: McpServerPublic | null;
  upserted: number;
  activated: boolean;
  error?: string;
}> {
  const server = await ensureCanvaHubBootstrapServer();
  if (!server) {
    return {
      ok: false,
      item: null,
      upserted: 0,
      activated: false,
      error: 'NEXTAUTH_URL/PUBLIC_APP_URL missing — cannot bootstrap Canva MCP URL',
    };
  }

  const discovered = await discoverMcpHubServer(server.id);
  if (!discovered.ok) {
    return {
      ok: false,
      item: toPublicMcpServer(server, 0),
      upserted: 0,
      activated: false,
      error: discovered.error ?? 'discover failed',
    };
  }

  const tools = await listMcpServerTools(server.id);
  for (const tool of tools) {
    const want = DEFAULT_HUB_CAPABILITY_BY_EXPOSED[tool.exposedName];
    if (want && tool.capabilityId !== want) {
      await patchMcpServerTool(tool.id, { capabilityId: want });
    }
  }
  invalidateHubCapabilityMapCache();

  let activated = false;
  let next = server;
  if (canvaEnvReady()) {
    const patched = await patchMcpServer(server.id, { status: 'active', lastError: null });
    if (patched) {
      next = patched;
      activated = true;
    }
  }
  invalidateHubRoutingHintsCache();
  const toolCount = (await listMcpServerTools(next.id)).length;
  return {
    ok: true,
    item: toPublicMcpServer(next, toolCount),
    upserted: discovered.upserted ?? toolCount,
    activated,
    error: activated
      ? undefined
      : 'Server drafted — set CANVA_CLIENT_* + MCP_HUB_TOKEN_ENCRYPTION_KEY then re-activate',
  };
}
