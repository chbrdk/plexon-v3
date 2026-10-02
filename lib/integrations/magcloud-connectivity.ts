import { getMagcloudMcpUrl } from '@/lib/constants';

/**
 * System prompt block when Magcloud MCP is available / missing.
 */
export function buildMagcloudIntegrationContextBlock(input: {
  useMagcloudMcp: boolean;
}): string {
  const mcpUrl = getMagcloudMcpUrl();
  if (!input.useMagcloudMcp || !mcpUrl) {
    return [
      '## Magcloud',
      '- MCP-Tools: **deaktiviert** (MAGCLOUD_MCP_URL fehlt – magcloud_* boards/search/ingest nicht verfügbar)',
      '- Keine erfundenen Board-/Folien-Inhalte.',
    ].join('\n');
  }
  return [
    '## Magcloud',
    '- MCP-Tools **aktiv** (boards_list, board_summarize, slides_search, ingest_jobs, meta_conflicts; Write: ingest_start / meta_conflict_resolve mit Confirm).',
    '- Nur API-Ergebnisse verwenden; keine Pitch-Fakten erfinden. SharePoint-Sync erst nach Graph-Secrets.',
    '- Boards = Slide-Universe Insel; Shell = Collection binding.',
  ].join('\n');
}
