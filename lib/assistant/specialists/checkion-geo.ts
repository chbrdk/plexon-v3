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
    '- Bei SEO/GEO-/Wettbewerbs-Fragen **zuerst** checkion geo_* / seo_* / project tools — limit ≤ 10.',
  );
  lines.push(
    '- Quality SEO = Domain-Crawl (`domain_scan_*`); Market SEO = project-scoped `seo_overview` / `seo_keywords` / `seo_domain` / `seo_backlinks` / `seo_rank_configs_*` / `seo_competitors` / `seo_gsc`.',
  );
  lines.push(
    '- Scores, Zitationsanteile, Rankings und Competitor-URLs **nur** aus Tool-Ergebnissen — keine erfundenen Rankings.',
  );
  lines.push(
    '- Collection-Kontext: checkionProjectId / platformProjectId aus dem Prompt-Kontext nutzen.',
  );
  if (misconfig) lines.push(`- Ops: ${misconfig}`);
  return lines.join('\n');
}
