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
 * Pattern mirrors brandion-connectivity (tool-first + Auto-UI hints).
 */
export function buildMetronIntegrationContextBlock(input: {
  useMetronMcp: boolean;
}): string {
  const diag = getMetronUrlDiagnostics();
  const lines = ['## METRON (KPIs / Dashboards)'];

  if (!diag.mcpUrlSet) {
    lines.push(
      '- MCP-Tools: **deaktiviert** (METRON_MCP_URL fehlt – metron_* list/get/evaluate nicht verfügbar)',
    );
    lines.push('- KPI-/Dashboard-Zahlen nicht erfinden; ohne Tools nur allgemeine Beratung.');
    return lines.join('\n');
  }

  if (!input.useMetronMcp) {
    lines.push(
      '- MCP-Tools: **deaktiviert** (kein Metron-Entitlement und Host ist kein Plattform-/Sibling-Shell)',
    );
    lines.push('- Analytics-Fakten nicht erfinden; Nutzer ggf. auf METRON oder Entitlement verweisen.');
    return lines.join('\n');
  }

  lines.push(`- MCP-Tools: **aktiv** (Server: ${diag.mcpUrlPrefix ?? '…'}…)`);
  lines.push(
    '- Bei KPI-/Dashboard-/Dataset-Fragen **zuerst** metron_projects_list / datasets_list / kpis_list / dashboards_list — dann get/evaluate/summarize. Zahlen **nur** aus Tool-Ergebnissen (Server-SSOT).',
  );
  lines.push(
    '- KPI-Werte: metron_kpi_evaluate oder metron_kpi_summarize — niemals schätzen. Period/Provenance aus dem Evaluate-Ergebnis übernehmen.',
  );
  lines.push(
    '- Nach list/get/evaluate erscheinen automatisch Metric-Grid / Link-List / Chart — Kurzkommentar, keine zweite volle Tabelle per plexon_ui_append_block.',
  );
  lines.push(
    '- Share: nach Dashboard-Get/Summarize erscheint die Share-Bar (öffentlicher Link) — nicht per Tool erfinden.',
  );
  lines.push(
    '- Wenn Seitenkontext entityType=dashboard|kpi|dataset mit entityId: id nicht erneut erfragen; Tools injecten die id.',
  );
  lines.push(
    '- Suite→Overview (Chat-Playbook, kein Auto-Create): nach metron_suite_connectors_sync (Confirm) → metron_kpi_starter_pack_install packId=checkion-site-health (Confirm) → metron_dashboard_create „CHECKION site health“ (Confirm). Nie still sync+board in einem Schritt ohne Bestätigung.',
  );
  lines.push(
    '- KPI anlegen: metron_kpi_create mit status=draft bevorzugen; Formula nur als valides JSON (Server-SSOT) — Confirm-Gate.',
  );
  return lines.join('\n');
}
