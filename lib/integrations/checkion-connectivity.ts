import {
  getCheckionMcpUrl,
  getCheckionServiceApiUrl,
  getCheckionServiceToken,
  getCheckionUrl,
} from '@/lib/constants';
import { checkionApiProjectsCreate } from '@/lib/paths/checkion-api';

export type CheckionProbeResult = {
  ok: boolean;
  status?: number;
  hint?: string;
};

export type CheckionUrlDiagnostics = {
  apiUrlExplicit: boolean;
  apiUrlPrefix: string;
  publicUrlPrefix: string;
  hasAssistantToken: boolean;
  assistantTokenFormatOk: boolean;
  hasAdminApiKey: boolean;
  hasServiceTokenAlias: boolean;
  mcpUrlSet: boolean;
  mcpUrlPrefix: string | null;
};

/** True when CHECKION user API token looks like `checkion_` + 64 hex (Settings → API access). */
export function isCheckionUserApiTokenFormat(token: string): boolean {
  return /^checkion_[a-f0-9]{64}$/i.test(token);
}

export function getCheckionUrlDiagnostics(): CheckionUrlDiagnostics {
  const explicit = Boolean(process.env.CHECKION_API_URL?.trim());
  const apiUrl = getCheckionServiceApiUrl().replace(/\/+$/, '');
  const publicUrl = getCheckionUrl().replace(/\/+$/, '');
  const assistantToken = getCheckionServiceToken() ?? '';
  const mcpUrl = getCheckionMcpUrl();

  return {
    apiUrlExplicit: explicit,
    apiUrlPrefix: apiUrl.slice(0, 48),
    publicUrlPrefix: publicUrl.slice(0, 48),
    hasAssistantToken: assistantToken.length > 0,
    assistantTokenFormatOk: isCheckionUserApiTokenFormat(assistantToken),
    hasAdminApiKey: Boolean(process.env.CHECKION_ADMIN_API_KEY?.trim()),
    hasServiceTokenAlias: Boolean(process.env.CHECKION_SERVICE_TOKEN?.trim()),
    mcpUrlSet: Boolean(mcpUrl),
    mcpUrlPrefix: mcpUrl ? mcpUrl.slice(0, 48) : null,
  };
}

export function formatCheckionMisconfigHint(diag: CheckionUrlDiagnostics): string | null {
  const hints: string[] = [];
  if (!diag.hasAssistantToken) {
    if (diag.hasAdminApiKey) {
      hints.push(
        'CHECKION_API_TOKEN fehlt auf dem PLEXON-Container (CHECKION_ADMIN_API_KEY ist ein anderer Key und reicht für Assistant-Workflows nicht)'
      );
    } else {
      hints.push(
        'CHECKION_API_TOKEN fehlt auf dem PLEXON-Container (nicht nur auf dem CHECKION-MCP-Service setzen)'
      );
    }
  } else if (!diag.assistantTokenFormatOk) {
    hints.push(
      'CHECKION_API_TOKEN hat unerwartetes Format (erwartet checkion_ + 64 Hex aus CHECKION → Einstellungen → API-Zugang)'
    );
  }
  if (!diag.mcpUrlSet) {
    hints.push('CHECKION_MCP_URL fehlt – Board-MCP-Tools sind deaktiviert');
  }
  return hints.length > 0 ? hints.join('; ') : null;
}

export function checkionMissingTokenError(): string {
  return formatCheckionMisconfigHint(getCheckionUrlDiagnostics()) ?? 'CHECKION_API_TOKEN fehlt auf PLEXON';
}

export function formatCheckionScanHttpFailure(status: number, body: string): string {
  const snippet = body.trim().slice(0, 160).replace(/\s+/g, ' ');
  if (status === 503 && /service temporarily unavailable/i.test(body)) {
    return (
      'CHECKION Scan: HTTP 503 – Rate-Limit/Redis auf CHECKION prüfen (Logs: „checkRateLimit failed“). ' +
      'Coolify CHECKION: REDIS_URL korrigieren, entfernen oder CHECKION_DISABLE_REDIS_RATE_LIMIT=1; danach Redeploy.'
    );
  }
  if (status === 503 && /authentication temporarily unavailable/i.test(body)) {
    return (
      'CHECKION Scan: HTTP 503 – CHECKION-Datenbank/API-Token-Lookup fehlgeschlagen. DATABASE_URL und CHECKION-Logs prüfen.'
    );
  }
  if (status === 429) {
    return 'CHECKION Scan: HTTP 429 – Rate-Limit erreicht. Kurz warten und erneut versuchen.';
  }
  if (status === 401 || status === 403) {
    return `CHECKION Scan: HTTP ${status} – CHECKION_API_TOKEN ungültig oder abgelaufen (neu erzeugen in CHECKION → API-Zugang).`;
  }
  return snippet ? `CHECKION Scan: HTTP ${status} – ${snippet}` : `CHECKION Scan: HTTP ${status}`;
}

export function resolveCheckionServiceAuth():
  | { ok: true; token: string; headers: Record<string, string> }
  | { ok: false; error: string } {
  const token = getCheckionServiceToken();
  if (!token) {
    return { ok: false, error: checkionMissingTokenError() };
  }
  return {
    ok: true,
    token,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
}

export async function probeCheckionApiHealth(): Promise<CheckionProbeResult> {
  const auth = resolveCheckionServiceAuth();
  if (!auth.ok) {
    return { ok: false, hint: auth.error };
  }

  try {
    const res = await fetch(checkionApiProjectsCreate(), {
      method: 'GET',
      headers: { Authorization: auth.headers.Authorization },
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.text();
      return {
        ok: false,
        status: res.status,
        hint: body.slice(0, 120) || `HTTP ${res.status}`,
      };
    }
    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, hint: e instanceof Error ? e.message : String(e) };
  }
}
