import { getSpirionMcpUrl } from '@/lib/constants';

export type SpirionUrlDiagnostics = {
  mcpUrlSet: boolean;
  mcpUrlPrefix: string | null;
};

export function getSpirionUrlDiagnostics(): SpirionUrlDiagnostics {
  const mcpUrl = getSpirionMcpUrl();
  return {
    mcpUrlSet: Boolean(mcpUrl),
    mcpUrlPrefix: mcpUrl ? mcpUrl.slice(0, 56) : null,
  };
}

/** System-prompt block for SPIRION MCP availability. Spec: assistant-spirion-mcp.md */
export function buildSpirionIntegrationContextBlock(input: {
  useSpirionMcp: boolean;
}): string {
  const diag = getSpirionUrlDiagnostics();
  const lines = ['## SPIRION (Design References / Screens)'];

  if (!diag.mcpUrlSet) {
    lines.push(
      '- MCP-Tools: **deaktiviert** (SPIRION_MCP_URL fehlt – spirion.references_* / screens_* nicht verfügbar)',
    );
    lines.push('- Design-Referenzen nicht erfinden; ohne Tools nur allgemeine Beratung.');
    return lines.join('\n');
  }

  if (!input.useSpirionMcp) {
    lines.push(
      '- MCP-Tools: **deaktiviert** (kein aktives Spirion-Entitlement und Host-Produkt nicht freigeschaltet)',
    );
    lines.push('- Nutzer ggf. auf SPIRION-Hub oder Entitlement verweisen.');
    return lines.join('\n');
  }

  lines.push(`- MCP-Tools: **aktiv** (Server: ${diag.mcpUrlPrefix ?? '…'}…)`);
  lines.push(
    '- Bei Referenz-/Screen-/Moodboard-Fragen **zuerst** spirion_references_search / spirion_screens_search (oder dig_*) — Patterns nicht schätzen.',
  );
  lines.push(
    '- Bei CREATION Scene-Builds: search für **Homepage/Landing**-Struktur/Copy (kein 1:1 Clone). **Leerer Corpus = OK** → Editorial-Fallback (Linear/Verve/Superhuman-Muster: Header-row, Hero+Stats-row, 3-col Benefits, Split, CTA, Footer) — siehe CREATION Layout-Tiefe. Dann import-html + content_audit; preview optional/soft.',
  );
  lines.push(
    '- Fehlende Tokens: bewusst Literale wählen (`set_style` / Props) — nicht stallen; Collection-Pack bevorzugen wenn passend (`creation_brand_tokens_get`).',
  );
  lines.push('- Welle 1 read-only: keine Capture-/Generate-Jobs starten.');
  return lines.join('\n');
}
