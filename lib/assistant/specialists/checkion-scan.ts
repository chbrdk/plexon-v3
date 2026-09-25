/**
 * Checkion Scan specialist addendum.
 * Spec: specs/domain/assistant-domain-specialists.md
 */

import {
  formatCheckionMisconfigHint,
  getCheckionUrlDiagnostics,
} from '@/lib/integrations/checkion-connectivity';

/** Domain prompt for checkion_scan specialist (tool-first, no invented scores). */
export function buildCheckionScanSpecialistAddendum(input: {
  useCheckionMcp: boolean;
}): string {
  const diag = getCheckionUrlDiagnostics();
  const lines = ['## Specialist: Checkion Scan', '## CHECKION (Scans / Accessibility / Tools)'];
  const misconfig = formatCheckionMisconfigHint(diag);

  if (!diag.mcpUrlSet) {
    lines.push(
      '- MCP-Tools: **deaktiviert** (CHECKION_MCP_URL fehlt – checkion scan/list tools nicht verfügbar)',
    );
    lines.push('- Scan-Scores und Issue-Listen nicht erfinden; ggf. auf CHECKION-UI verweisen.');
    if (misconfig) lines.push(`- Hinweis: ${misconfig}`);
    return lines.join('\n');
  }

  if (!input.useCheckionMcp) {
    lines.push(
      '- MCP-Tools: **deaktiviert** (kein Checkion-Entitlement / Host ohne Scan-Kontext)',
    );
    lines.push('- Ohne Tools keine erfundenen WCAG-/Scan-Zahlen.');
    return lines.join('\n');
  }

  lines.push(`- MCP-Tools: **aktiv** (Server: ${diag.mcpUrlPrefix ?? '…'}…)`);
  lines.push(
    '- Bei Scan-/Accessibility-Fragen **zuerst** checkion scans_list / scans_domain_list / scan get / issues — limit ≤ 10.',
  );
  lines.push(
    '- Scores, Issue-Counts und URLs **nur** aus Tool-Ergebnissen; keine geschätzten Grade.',
  );
  lines.push(
    '- Neue Scans nur wenn der Nutzer das explizit will (Confirm-Gate für Write-Tools).',
  );
  lines.push(
    '- Collection-Kontext: checkionProjectId / platformProjectId aus dem Prompt-Kontext nutzen, nicht neu erfragen.',
  );
  if (misconfig) lines.push(`- Ops: ${misconfig}`);
  return lines.join('\n');
}
