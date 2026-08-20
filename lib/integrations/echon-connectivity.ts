import { getEchonMcpUrl } from '@/lib/constants';
import {
  echonHealthPath,
  echonIntegrationUrl,
  getEchonApiBaseUrl,
  getEchonServiceToken,
} from '@/lib/paths/echon-api';

export type EchonUrlDiagnostics = {
  apiUrlPrefix: string;
  apiUrlFromEnv: boolean;
  hasServiceToken: boolean;
  mcpUrlSet: boolean;
  mcpUrlPrefix: string | null;
};

export function getEchonUrlDiagnostics(): EchonUrlDiagnostics {
  const mcpUrl = getEchonMcpUrl();
  return {
    apiUrlPrefix: getEchonApiBaseUrl().slice(0, 56),
    apiUrlFromEnv: Boolean(process.env.ECHON_API_URL?.trim()),
    hasServiceToken: Boolean(getEchonServiceToken()),
    mcpUrlSet: Boolean(mcpUrl),
    mcpUrlPrefix: mcpUrl ? mcpUrl.slice(0, 56) : null,
  };
}

export function formatEchonMisconfigHint(diag: EchonUrlDiagnostics): string | null {
  const hints: string[] = [];
  if (!diag.mcpUrlSet) {
    hints.push('ECHON_MCP_URL fehlt – Markt-Intelligence-MCP ist deaktiviert');
  }
  if (!diag.apiUrlFromEnv) {
    hints.push(
      'ECHON_API_URL nicht gesetzt – Fallback auf öffentliche URL; in Coolify intern http://echon-v2-api:8000 setzen'
    );
  }
  return hints.length > 0 ? hints.join('; ') : null;
}

export function isEchonHtmlResponse(contentType: string | null, body: string): boolean {
  const ct = (contentType ?? '').toLowerCase();
  if (ct.includes('text/html')) return true;
  const sample = body.slice(0, 400).toLowerCase();
  return sample.startsWith('<!doctype') || sample.startsWith('<html');
}

export function formatEchonHttpFailure(
  status: number,
  contentType: string | null,
  body: string,
  context: string
): string {
  if (isEchonHtmlResponse(contentType, body)) {
    return `${context}: HTML-Antwort (${status}) – ECHON_API_URL zeigt vermutlich auf Next.js statt FastAPI. Setze http://echon-v2-api:8000`;
  }
  const snippet = body.trim().slice(0, 120).replace(/\s+/g, ' ');
  return snippet ? `${context}: HTTP ${status} – ${snippet}` : `${context}: HTTP ${status}`;
}

export type EchonProbeResult = {
  ok: boolean;
  status?: number;
  hint?: string;
  diagnostics: EchonUrlDiagnostics;
};

export async function probeEchonApiHealth(): Promise<EchonProbeResult> {
  const diagnostics = getEchonUrlDiagnostics();
  const misconfig = formatEchonMisconfigHint(diagnostics);
  const token = getEchonServiceToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(echonIntegrationUrl(echonHealthPath()), {
      headers,
      cache: 'no-store',
    });
    const body = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        hint: formatEchonHttpFailure(res.status, res.headers.get('content-type'), body, 'ECHON health'),
        diagnostics,
      };
    }
    if (isEchonHtmlResponse(res.headers.get('content-type'), body)) {
      return {
        ok: false,
        hint: misconfig ?? 'ECHON health returned HTML',
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

export async function buildEchonIntegrationContextBlock(input: {
  useEchonMcp: boolean;
}): Promise<string> {
  const diag = getEchonUrlDiagnostics();
  if (!input.useEchonMcp) {
    return `## ECHON (Markt-Intelligence)
- MCP-Tools: **deaktiviert** (ECHON_MCP_URL fehlt oder Gate resolveUseEchonMcp greift nicht)`;
  }
  const probe = await probeEchonApiHealth();
  const lines = [
    '## ECHON (Markt-Intelligence)',
    `- MCP: aktiv (${diag.mcpUrlPrefix ?? '?'})`,
    `- API: ${diag.apiUrlPrefix}${probe.ok ? ' ✓' : ' ✗'}`,
    '- Rolle: externe Markt-Signale, Waves, Foresight, Research — **nicht** Site-Qualität (das ist CHECKION)',
    '- Workflow: ECHON Markt recherchieren → Erkenntnisse in AUDION Zielgruppen ableiten',
    '- Tools: echon_signals_list, echon_waves_list, echon_foresight_* (schnell); echon_research_chat (sync); echon_research_run_start / echon_signal_ingest / echon_waves_detect (Bestätigung)',
    '- project_id für AUDION-Tools: **audionProjectId** aus Projektkontext (UUID), nicht platformProjectId',
  ];
  if (probe.hint) lines.push(`- Hinweis: ${probe.hint}`);
  return lines.join('\n');
}
