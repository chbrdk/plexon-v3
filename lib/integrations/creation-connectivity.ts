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
    '- Bei Scene-Layout: Prefetch-Outline; Palette (seedProps/contentHint) bei Bedarf. Schreiben: creation_scene_apply_ops. Neue Seite/Zeichenfläche (PDP, Pricing, …): zuerst `add_page` {name?} (aktiviert die neue Page), dann Tree/Response lesen und unter `scene.root.id` inserten — nicht nur auf Home stapeln. Auch: set_active_page, rename_page, duplicate_page, delete_page, move_node_to_page. Insert-Ops NUR `insert_child` (parentId + child {id,type,name,props}) oder `insert_instance` (masterId+parentId). Niemals insert_node / add_instance / append_child. Marketing/PDP: Site Kit — SiteButton props.children=CTA, SiteInput placeholder, SiteSelect options (Zeilen), SiteImage src+alt, SiteText role+children. insert_child merged Defaults; echte Copy trotzdem setzen. 400 op-rejected: `reason` lesen, nicht andere Op-Namen raten. 409 stale-scene: Tree neu laden, neues updatedAt als baseUpdatedAt.',
  );
  lines.push('- Fixture-Snapshot: SoT bleibt Zaoly `@zaoly/library`; Catalog ist Orientierung, kein Live-CEM.');
  return lines.join('\n');
}
