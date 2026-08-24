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
    '- Bei Scene-Layout: Prefetch-Outline; Palette (seedProps/contentHint) bei Bedarf. Greenfield Landing: creation_scene_import_html (ein HTML-Dokument). Schreiben sonst: creation_scene_apply_ops. Neue Seite (PDP, …): pageName am Import oder add_page zuerst → unter neuem root.id. Insert: bevorzugt insert_child mit echten props (SiteButton children=CTA, SiteSelect options als Zeilen, SiteText role+children, SiteImage alt). insert_instance nur mit props{} oder sofort set_prop — nackte Instances = „Get started“/„Option A“/„Text“ und sind VERBOTEN als Endzustand. Niemals insert_node / add_instance / append_child. 400: reason lesen. 409: Tree neu, neues baseUpdatedAt.',
  );
  lines.push('- Fixture-Snapshot: SoT bleibt Zaoly `@zaoly/library`; Catalog ist Orientierung, kein Live-CEM.');
  return lines.join('\n');
}
