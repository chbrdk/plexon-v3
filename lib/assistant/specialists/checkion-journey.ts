/**
 * Checkion Journey specialist addendum.
 * Spec: specs/domain/assistant-domain-specialists.md
 */

import {
  formatCheckionMisconfigHint,
  getCheckionUrlDiagnostics,
} from '@/lib/integrations/checkion-connectivity';

/** Domain prompt for checkion_journey specialist. */
export function buildCheckionJourneySpecialistAddendum(input: {
  useCheckionMcp: boolean;
}): string {
  const diag = getCheckionUrlDiagnostics();
  const lines = ['## Specialist: Checkion Journey', '## CHECKION (Journey / Scan-Journey)'];
  const misconfig = formatCheckionMisconfigHint(diag);

  if (!diag.mcpUrlSet) {
    lines.push(
      '- MCP-Tools: **deaktiviert** (CHECKION_MCP_URL fehlt – checkion journey tools nicht verfügbar)',
    );
    lines.push('- Journey-Schritte und Scan-States nicht erfinden; ggf. auf CHECKION-UI verweisen.');
    if (misconfig) lines.push(`- Hinweis: ${misconfig}`);
    return lines.join('\n');
  }

  if (!input.useCheckionMcp) {
    lines.push(
      '- MCP-Tools: **deaktiviert** (kein Checkion-Entitlement / Host ohne Journey-Kontext)',
    );
    lines.push('- Ohne Tools keine erfundenen Journey- oder Scan-Ergebnisse.');
    return lines.join('\n');
  }

  lines.push(`- MCP-Tools: **aktiv** (Server: ${diag.mcpUrlPrefix ?? '…'}…)`);
  lines.push(
    '- Bei Journey-Fragen **zuerst** checkion journey_* / scan_read — limit ≤ 10.',
  );
  lines.push('- Steps, Status und Issues **nur** aus Tool-Ergebnissen.');
  lines.push(
    '- Collection-Kontext: checkionProjectId / platformProjectId aus dem Prompt-Kontext nutzen.',
  );
  if (misconfig) lines.push(`- Ops: ${misconfig}`);
  return lines.join('\n');
}
