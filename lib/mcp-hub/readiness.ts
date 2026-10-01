/**
 * MCP Hub staging readiness (Wave H5) — env checklist, never secret values.
 * Spec: specs/domain/mcp-hub-staging-readiness.md
 */

import { runtimeEnv } from '@/lib/runtime-env';
import { hubTokenEncryptionConfigured } from '@/lib/mcp-hub/token-crypto';
import { getMcpServerBySlug, listMcpServerTools } from '@/lib/mcp-hub/store';
import { publicAppBaseUrl } from '@/lib/mcp-hub/oauth';

export type HubReadinessCheck = {
  id: string;
  ok: boolean;
  detail: string;
};

export async function getMcpHubReadiness(): Promise<{
  ok: boolean;
  checks: HubReadinessCheck[];
  canvaRedirectUrl: string;
}> {
  const checks: HubReadinessCheck[] = [];

  const appBase = publicAppBaseUrl();
  checks.push({
    id: 'app_base_url',
    ok: Boolean(appBase),
    detail: appBase
      ? 'NEXTAUTH_URL / PUBLIC_APP_URL gesetzt'
      : 'NEXTAUTH_URL oder PUBLIC_APP_URL fehlt',
  });

  checks.push({
    id: 'plexon_service_secret',
    ok: Boolean(runtimeEnv('PLEXON_SERVICE_SECRET')),
    detail: runtimeEnv('PLEXON_SERVICE_SECRET')
      ? 'PLEXON_SERVICE_SECRET gesetzt'
      : 'PLEXON_SERVICE_SECRET fehlt',
  });

  checks.push({
    id: 'canva_client_id',
    ok: Boolean(runtimeEnv('CANVA_CLIENT_ID')),
    detail: runtimeEnv('CANVA_CLIENT_ID')
      ? 'CANVA_CLIENT_ID gesetzt'
      : 'CANVA_CLIENT_ID fehlt (Coolify)',
  });

  checks.push({
    id: 'canva_client_secret',
    ok: Boolean(runtimeEnv('CANVA_CLIENT_SECRET')),
    detail: runtimeEnv('CANVA_CLIENT_SECRET')
      ? 'CANVA_CLIENT_SECRET gesetzt'
      : 'CANVA_CLIENT_SECRET fehlt (Coolify)',
  });

  const encOk = hubTokenEncryptionConfigured();
  checks.push({
    id: 'token_encryption',
    ok: encOk,
    detail: encOk
      ? 'MCP_HUB_TOKEN_ENCRYPTION_KEY gesetzt'
      : 'MCP_HUB_TOKEN_ENCRYPTION_KEY fehlt (≥16 Zeichen)',
  });

  let canvaServerOk = false;
  let canvaTools = 0;
  let canvaStatus = 'missing';
  try {
    const server = await getMcpServerBySlug('canva');
    if (server) {
      canvaStatus = server.status;
      const tools = await listMcpServerTools(server.id);
      canvaTools = tools.length;
      canvaServerOk = server.status === 'active' && tools.length > 0;
    }
  } catch {
    /* DB may be unavailable in unit tests */
  }
  checks.push({
    id: 'canva_hub_server',
    ok: canvaServerOk,
    detail: canvaServerOk
      ? `Canva Hub active · ${canvaTools} tools`
      : `Canva Hub: ${canvaStatus}${canvaTools ? ` · ${canvaTools} tools` : ''} — activate via Bootstrap`,
  });

  const canvaRedirectUrl = appBase
    ? `${appBase}/api/platform/mcp-hub/oauth/canva/callback`
    : '/api/platform/mcp-hub/oauth/canva/callback';

  return {
    ok: checks.every((c) => c.ok),
    checks,
    canvaRedirectUrl,
  };
}

export function canvaEnvReady(): boolean {
  return (
    Boolean(runtimeEnv('CANVA_CLIENT_ID')) &&
    Boolean(runtimeEnv('CANVA_CLIENT_SECRET')) &&
    hubTokenEncryptionConfigured() &&
    Boolean(runtimeEnv('PLEXON_SERVICE_SECRET')) &&
    Boolean(publicAppBaseUrl())
  );
}
