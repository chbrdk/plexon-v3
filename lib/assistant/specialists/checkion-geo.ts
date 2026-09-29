/**
 * Checkion GEO / SEO specialist addendum.
 * Spec: specs/domain/assistant-domain-specialists.md
 */

import {
  formatCheckionMisconfigHint,
  getCheckionUrlDiagnostics,
} from '@/lib/integrations/checkion-connectivity';

/** Domain prompt for checkion_seo_geo specialist (tool-first, no invented rankings). */
export function buildCheckionGeoSpecialistAddendum(input: {
  useCheckionMcp: boolean;
}): string {
  const diag = getCheckionUrlDiagnostics();
  const lines = ['## Specialist: Checkion GEO', '## CHECKION (SEO / GEO / Wettbewerb)'];
  const misconfig = formatCheckionMisconfigHint(diag);

  if (!diag.mcpUrlSet) {
    lines.push(
      '- MCP-Tools: **deaktiviert** (CHECKION_MCP_URL fehlt – checkion geo tools nicht verfügbar)',
    );
    lines.push('- Rankings, Zitations- und GEO-Scores nicht erfinden; ggf. auf CHECKION-UI verweisen.');
    if (misconfig) lines.push(`- Hinweis: ${misconfig}`);
    return lines.join('\n');
  }

  if (!input.useCheckionMcp) {
    lines.push(
      '- MCP-Tools: **deaktiviert** (kein Checkion-Entitlement / Host ohne GEO-Kontext)',
    );
    lines.push('- Ohne Tools keine erfundenen SEO-/GEO-Zahlen oder Competitor-Listen.');
    return lines.join('\n');
  }

  lines.push(`- MCP-Tools: **aktiv** (Server: ${diag.mcpUrlPrefix ?? '…'}…)`);
  lines.push(
    '- Bei SEO/GEO-/Wettbewerbs-Fragen **zuerst** checkion_v3_geo_jobs_list / geo_job_reading / seo_overview / seo_keywords — limit ≤ 10.',
  );
  lines.push(
    '- Quality SEO aus Deep Scan: checkion_v3_domain_scans_list → domain_scan_seo_reading / trust_reading / overview (nicht inventieren).',
  );
  lines.push(
    '- Scores, Zitationsanteile, Rankings und Competitor-URLs **nur** aus Tool-Ergebnissen — keine Legacy-Namen (geo_eeat_history) erfinden.',
  );
  lines.push(
    '- Collection-Kontext: checkionProjectId / platformProjectId aus dem Prompt-Kontext nutzen.',
  );
  if (misconfig) lines.push(`- Ops: ${misconfig}`);
  return lines.join('\n');
}
