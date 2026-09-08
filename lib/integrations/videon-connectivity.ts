import { getVideonMcpUrl } from '@/lib/constants';

export type VideonUrlDiagnostics = {
  mcpUrlSet: boolean;
  mcpUrlPrefix: string | null;
};

export function getVideonUrlDiagnostics(): VideonUrlDiagnostics {
  const mcpUrl = getVideonMcpUrl();
  return {
    mcpUrlSet: Boolean(mcpUrl),
    mcpUrlPrefix: mcpUrl ? mcpUrl.slice(0, 56) : null,
  };
}

/**
 * System-prompt block so the model does not invent media/scene facts when MCP is off,
 * and uses tools (deep links) when MCP is on.
 */
export function buildVideonIntegrationContextBlock(input: {
  useVideonMcp: boolean;
}): string {
  const diag = getVideonUrlDiagnostics();
  const lines = ['## VIDEON (Media / Scenes / Cuts)'];

  if (!diag.mcpUrlSet) {
    lines.push(
      '- MCP-Tools: **deaktiviert** (VIDEON_MCP_URL fehlt – videon_media_* / analysis / cuts nicht verfügbar)'
    );
    lines.push('- Szenen, Timecodes und Analyse-Status nicht erfinden; ohne Tools nur allgemeine Beratung.');
    return lines.join('\n');
  }

  if (!input.useVideonMcp) {
    lines.push(
      '- MCP-Tools: **deaktiviert** (kein aktives Videon-Entitlement und Host-Produkt ist nicht Videon)'
    );
    lines.push('- Medienfakten nicht erfinden; Nutzer ggf. auf VIDEON oder Entitlement verweisen.');
    return lines.join('\n');
  }

  lines.push(`- MCP-Tools: **aktiv** (Server: ${diag.mcpUrlPrefix ?? '…'}…)`);
  lines.push(
    '- Bei Szenen-/Video-/Clip-/Cut-/Analyse-Fragen **zuerst** videon_media_search / videon_media_list / videon_analysis_get / videon_cuts_list nutzen — Timecodes und Treffer nicht schätzen.'
  );
  lines.push(
    '- Treffer enthalten Editor-Deep-Links (`/media/…?t=&scene=`) — diese Links dem Nutzer geben; keine Binaries/Streams/Transcripts erfinden.'
  );
  lines.push('- Collection = einziges Nutzer-Projekt (Access Model B); kein zweites Projektmodell erfinden.');
  return lines.join('\n');
}
