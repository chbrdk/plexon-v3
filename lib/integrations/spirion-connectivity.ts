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
    '- Creation Landing/PDP: **zuerst** `spirion_captures_list` (**ohne** `platformProjectId`) → `spirion_capture_prompt_pack` → optional `spirion_compose_brief` — dann `creation_scene_import_html`.',
  );
  lines.push(
    '- `captures_list` mit Collection-`platformProjectId` filtert unbound Staging-Captures auf **[]** — Server strippt die ID; Agent darf sie dort nicht setzen.',
  );
  lines.push(
    '- Collection-Search (`spirion_screens_search` / `spirion_references_search`) braucht `platformProjectId` (wird injiziert wenn bekannt). 0 Treffer bei unbound Captures = häufig — **nicht** als „Corpus leer“ werten; Captures-Pfad nutzen.',
  );
  lines.push(
    '- Editorial-Fallback (Linear/Verve/Superhuman) **nur** wenn Captures-Liste leer / Packs fehlschlagen — siehe CREATION Layout-Tiefe.',
  );
  lines.push(
    '- Fehlende Tokens: bewusst Literale wählen (`set_style` / Props) — nicht stallen; Collection-Pack bevorzugen wenn passend (`creation_brand_tokens_get`).',
  );
  lines.push('- Welle 1 read-only: keine Capture-/Generate-Jobs starten (`job_start` / `generate` nicht aufrufen).');
  return lines.join('\n');
}
