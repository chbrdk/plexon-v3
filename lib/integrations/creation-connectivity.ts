import { getCreationMcpUrl } from '@/lib/constants';

export type CreationUrlDiagnostics = {
  mcpUrlSet: boolean;
  mcpUrlPrefix: string | null;
};

export function getCreationUrlDiagnostics(): CreationUrlDiagnostics {
  const mcpUrl = getCreationMcpUrl();
  return {
    mcpUrlSet: Boolean(mcpUrl),
    mcpUrlPrefix: mcpUrl ? mcpUrl.slice(0, 56) : null,
  };
}

/** System-prompt block for CREATION MCP availability. */
export function buildCreationIntegrationContextBlock(input: {
  useCreationMcp: boolean;
}): string {
  const diag = getCreationUrlDiagnostics();
  const lines = ['## CREATION (Library / Compositions)'];

  if (!diag.mcpUrlSet) {
    lines.push(
      '- MCP-Tools: **deaktiviert** (CREATION_MCP_URL fehlt – creation.library_* / compositions_* / projects_* nicht verfügbar)'
    );
    lines.push('- WC-Tags / Composition-Listen nicht erfinden; ohne Tools nur allgemeine Beratung.');
    return lines.join('\n');
  }

  if (!input.useCreationMcp) {
    lines.push(
      '- MCP-Tools: **deaktiviert** (kein aktives Creation-Entitlement und Host-Produkt ist nicht Creation)'
    );
    lines.push('- Nutzer ggf. auf CREATION-Hub oder Entitlement verweisen.');
    return lines.join('\n');
  }

  lines.push(`- MCP-Tools: **aktiv** (Server: ${diag.mcpUrlPrefix ?? '…'}…)`);
  lines.push(
    '- Bei Library-/Composition-/CREATION-Fragen **zuerst** creation_library_catalog / creation_compositions_list / creation_projects_list nutzen — Tags nicht schätzen.',
  );
  lines.push(
    '- Bei Scene-Layout: Scene-Tree-Outline kommt oft als Prefetch; creation_editor_palette nur bei Bedarf. Schreiben nur mit Nutzerauftrag via creation_scene_apply_ops (baseUpdatedAt!). Publish: creation.site_kit_composition_save mit sceneId+masterId.',
  );
  lines.push('- Fixture-Snapshot: SoT bleibt Zaoly `@zaoly/library`; Catalog ist Orientierung, kein Live-CEM.');
  return lines.join('\n');
}
