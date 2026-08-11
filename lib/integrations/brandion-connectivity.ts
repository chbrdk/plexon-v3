import { getBrandionMcpUrl } from '@/lib/constants';

export type BrandionUrlDiagnostics = {
  mcpUrlSet: boolean;
  mcpUrlPrefix: string | null;
};

export function getBrandionUrlDiagnostics(): BrandionUrlDiagnostics {
  const mcpUrl = getBrandionMcpUrl();
  return {
    mcpUrlSet: Boolean(mcpUrl),
    mcpUrlPrefix: mcpUrl ? mcpUrl.slice(0, 56) : null,
  };
}

/**
 * System-prompt block so the model does not invent "MCP unavailable" when tools are active,
 * and states the real gate when they are not.
 */
export function buildBrandionIntegrationContextBlock(input: {
  useBrandionMcp: boolean;
}): string {
  const diag = getBrandionUrlDiagnostics();
  const lines = ['## BRANDION (Guidelines / Design Tokens)'];

  if (!diag.mcpUrlSet) {
    lines.push(
      '- MCP-Tools: **deaktiviert** (BRANDION_MCP_URL fehlt – brandion.guidelines_* / brandion.tokens_* nicht verfügbar)'
    );
    lines.push('- Farben/CD nicht erfinden; ohne Tools nur allgemeine Beratung.');
    return lines.join('\n');
  }

  if (!input.useBrandionMcp) {
    lines.push(
      '- MCP-Tools: **deaktiviert** (kein aktives Brandion-Entitlement und Host-Produkt ist nicht Brandion)'
    );
    lines.push('- Farben/CD nicht erfinden; Nutzer ggf. auf Brandion-Guideline oder Entitlement verweisen.');
    return lines.join('\n');
  }

  lines.push(`- MCP-Tools: **aktiv** (Server: ${diag.mcpUrlPrefix ?? '…'}…)`);
  lines.push(
    '- Bei Marken-/Farb-/Token-/Guideline-Fragen **zuerst** brandion_guidelines_list / brandion_guideline_get / brandion_tokens_list nutzen — Hex/Namen nicht schätzen.'
  );
  lines.push('- `@msqdx/ui-tokens` ist nicht die Brandion-Guideline-Wahrheit.');
  return lines.join('\n');
}
