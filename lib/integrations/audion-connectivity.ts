import {
  getAudionAdminUrl,
  getAudionMcpUrl,
  getAudionServiceApiUrl,
  getAudionServiceToken,
} from '@/lib/constants';

export type AudionUrlDiagnostics = {
  apiUrlExplicit: boolean;
  apiUrlPrefix: string;
  looksLikeWebApp: boolean;
  hasToken: boolean;
  tokenFormatOk: boolean;
  mcpUrlSet: boolean;
  mcpUrlPrefix: string | null;
  adminUrlPrefix: string;
};

export function getAudionUrlDiagnostics(): AudionUrlDiagnostics {
  const explicit = Boolean(process.env.AUDION_API_URL?.trim());
  const apiUrl = getAudionServiceApiUrl().replace(/\/+$/, '');
  const adminOrigin = getAudionAdminUrl()
    .replace(/\/+$/, '')
    .replace(/\/admin$/, '');
  const token = getAudionServiceToken() ?? '';
  const mcpUrl = getAudionMcpUrl();
  const publicApiBase = `${adminOrigin}/api`;

  const looksLikeWebApp = Boolean(
    apiUrl === adminOrigin ||
      /\/admin(\/|$)/i.test(apiUrl) ||
      (apiUrl.startsWith(`${adminOrigin}/`) &&
        apiUrl !== publicApiBase &&
        !apiUrl.startsWith(`${publicApiBase}/`) &&
        !apiUrl.includes(':8000'))
  );

  return {
    apiUrlExplicit: explicit,
    apiUrlPrefix: apiUrl.slice(0, 48),
    looksLikeWebApp,
    hasToken: token.length > 0,
    tokenFormatOk: /^audion_[a-f0-9]{32,}$/i.test(token),
    mcpUrlSet: Boolean(mcpUrl),
    mcpUrlPrefix: mcpUrl ? mcpUrl.slice(0, 48) : null,
    adminUrlPrefix: adminOrigin.slice(0, 48),
  };
}

export function formatAudionMisconfigHint(diag: AudionUrlDiagnostics): string | null {
  const hints: string[] = [];
  if (!diag.hasToken) {
    hints.push('AUDION_API_TOKEN fehlt auf dem PLEXON-Container');
  } else if (!diag.tokenFormatOk) {
    hints.push('AUDION_API_TOKEN hat unerwartetes Format (erwartet audion_ + Hex)');
  }
  if (diag.looksLikeWebApp) {
    hints.push(
      'AUDION_API_URL zeigt auf die AUDION-Web-App ohne /api – setze z.B. https://audion…/api oder http://audion-api:8000'
    );
  }
  if (!diag.mcpUrlSet) {
    hints.push('AUDION_MCP_URL fehlt – Assistant-MCP-Tools sind deaktiviert');
  }
  return hints.length > 0 ? hints.join('; ') : null;
}

export function isAudionHtmlOrLoginRedirect(contentType: string | null, body: string): boolean {
  const ct = (contentType ?? '').toLowerCase();
  if (ct.includes('text/html')) return true;
  const sample = body.slice(0, 400).toLowerCase();
  return sample.includes('/login') || sample.startsWith('<!doctype') || sample.startsWith('<html');
}

export function formatAudionHttpFailure(
  status: number,
  contentType: string | null,
  body: string,
  context: string
): string {
  if (isAudionHtmlOrLoginRedirect(contentType, body)) {
    return `${context}: Login-Redirect/HTML (${status}) – AUDION_API_URL vermutlich falsch (Web statt FastAPI). Coolify: AUDION_API_URL=http://audion-api:8000 und AUDION_API_TOKEN=audion_…`;
  }
  const snippet = body.trim().slice(0, 120).replace(/\s+/g, ' ');
  return snippet
    ? `${context}: HTTP ${status} – ${snippet}`
    : `${context}: HTTP ${status}`;
}

export type AudionProbeResult = {
  ok: boolean;
  status?: number;
  hint?: string;
  diagnostics: AudionUrlDiagnostics;
};

export async function probeAudionApiHealth(): Promise<AudionProbeResult> {
  const diagnostics = getAudionUrlDiagnostics();
  const misconfig = formatAudionMisconfigHint(diagnostics);
  const token = getAudionServiceToken();
  const base = getAudionServiceApiUrl().replace(/\/+$/, '');

  if (!token) {
    return { ok: false, hint: misconfig ?? 'AUDION_API_TOKEN fehlt', diagnostics };
  }
  if (diagnostics.looksLikeWebApp) {
    return {
      ok: false,
      hint: misconfig ?? 'AUDION_API_URL zeigt auf Web-App',
      diagnostics,
    };
  }

  try {
    const res = await fetch(`${base}/projects`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      redirect: 'manual',
    });
    const body = await res.text();
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location') ?? '';
      return {
        ok: false,
        status: res.status,
        hint: `Redirect nach ${location || '?'} – AUDION_API_URL zeigt auf Web-App, nicht FastAPI`,
        diagnostics,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        hint: formatAudionHttpFailure(res.status, res.headers.get('content-type'), body, 'AUDION /projects'),
        diagnostics,
      };
    }
    if (isAudionHtmlOrLoginRedirect(res.headers.get('content-type'), body)) {
      return {
        ok: false,
        status: res.status,
        hint: 'AUDION /projects lieferte HTML statt JSON – AUDION_API_URL falsch (fehlt /api?)',
        diagnostics,
      };
    }
    try {
      JSON.parse(body) as { items?: unknown[] };
    } catch {
      return {
        ok: false,
        status: res.status,
        hint: 'AUDION /projects lieferte kein JSON',
        diagnostics,
      };
    }
    return { ok: true, status: res.status, diagnostics };
  } catch (e) {
    return {
      ok: false,
      hint: e instanceof Error ? e.message : String(e),
      diagnostics,
    };
  }
}

export type AudionProjectPreview = { id: string; name: string };

export async function fetchAudionProjectsPreview(): Promise<
  { ok: true; items: AudionProjectPreview[] } | { ok: false; error: string }
> {
  const token = getAudionServiceToken();
  if (!token) return { ok: false, error: 'AUDION_API_TOKEN fehlt auf PLEXON' };

  const diag = getAudionUrlDiagnostics();
  if (diag.looksLikeWebApp) {
    return { ok: false, error: 'AUDION_API_URL zeigt auf Web-App (ohne /api)' };
  }

  const base = getAudionServiceApiUrl().replace(/\/+$/, '');
  try {
    const res = await fetch(`${base}/projects`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      redirect: 'manual',
    });
    const body = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        error: formatAudionHttpFailure(res.status, res.headers.get('content-type'), body, 'AUDION Projekte'),
      };
    }
    const json = JSON.parse(body) as { items?: Array<{ id?: string; name?: string }> };
    const items = (json.items ?? [])
      .filter((p): p is { id: string; name: string } => Boolean(p.id && p.name))
      .map((p) => ({ id: p.id, name: p.name }));
    return { ok: true, items };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function buildAudionIntegrationContextBlock(input: {
  useAudionMcp: boolean;
}): Promise<string> {
  const diag = getAudionUrlDiagnostics();
  const lines = ['## AUDION-Anbindung (PLEXON-Server)'];

  if (!diag.hasToken) {
    lines.push('- REST: **nicht konfiguriert** (AUDION_API_TOKEN fehlt in Coolify/PLEXON)');
  } else {
    const projects = await fetchAudionProjectsPreview();
    if (projects.ok) {
      lines.push(`- REST: **ok** – ${projects.items.length} AUDION-Projekt(e) abrufbar`);
      for (const p of projects.items.slice(0, 15)) {
        lines.push(`  - ${p.name} (\`audionProjectId: ${p.id}\`)`);
      }
      if (projects.items.length === 0) {
        lines.push('  - (keine Projekte in AUDION)');
      }
    } else {
      lines.push(`- REST: **Fehler** – ${projects.error}`);
    }
  }

  if (!diag.mcpUrlSet) {
    lines.push(
      '- MCP-Tools: **deaktiviert** (AUDION_MCP_URL fehlt – audion.projects_list etc. nicht verfügbar)'
    );
  } else if (!input.useAudionMcp) {
    lines.push('- MCP-Tools: **deaktiviert** (kein aktives AUDION-Entitlement für diesen Nutzer)');
  } else {
    lines.push(`- MCP-Tools: **aktiv** (Server: ${diag.mcpUrlPrefix ?? '…'}…)`);
    lines.push(
      '  - Bei Tool-Fehlern: AUDION_API_URL + AUDION_API_TOKEN auch im **AUDION-MCP-Container** prüfen'
    );
  }

  return lines.join('\n');
}
