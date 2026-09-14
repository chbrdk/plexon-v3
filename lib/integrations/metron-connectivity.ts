import { getMetronMcpUrl } from '@/lib/constants';

export type MetronUrlDiagnostics = {
  mcpUrlSet: boolean;
  mcpUrlPrefix: string | null;
};

export function getMetronUrlDiagnostics(): MetronUrlDiagnostics {
  const mcpUrl = getMetronMcpUrl();
  return {
    mcpUrlSet: Boolean(mcpUrl),
    mcpUrlPrefix: mcpUrl ? mcpUrl.slice(0, 56) : null,
  };
}

/**
 * System-prompt block so the model uses METRON MCP for KPI/dashboard claims when available.
 */
export function buildMetronIntegrationContextBlock(input: {
  useMetronMcp: boolean;
}): string {
  const diag = getMetronUrlDiagnostics();
  const lines = ['## METRON (KPIs / Dashboards)'];

  if (!diag.mcpUrlSet) {
    lines.push(
      '- MCP-Tools: **deaktiviert** (METRON_MCP_URL fehlt – metron_* list/get/summarize nicht verfügbar)',
    );
    lines.push('- KPI-/Dashboard-Zahlen nicht erfinden; ohne Tools nur allgemeine Beratung.');
    return lines.join('\n');
  }

  if (!input.useMetronMcp) {
    lines.push(
      '- MCP-Tools: **deaktiviert** (kein aktives Metron-Entitlement und Host-Produkt ist nicht Metron)',
    );
    lines.push('- Analytics-Fakten nicht erfinden; Nutzer ggf. auf METRON oder Entitlement verweisen.');
    return lines.join('\n');
  }

  lines.push('- MCP-Tools: **aktiv** — nutze metron_projects_list / datasets_list / kpis_list / dashboards_list / dashboard_get / dashboard_summarize.');
  lines.push('- Zahlen und Dashboard-Inhalte nur aus Tool-Ergebnissen; keine erfundenen KPIs.');
  lines.push(`- MCP URL prefix: \`${diag.mcpUrlPrefix}\``);
  return lines.join('\n');
}
