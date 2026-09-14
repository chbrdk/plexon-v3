/**
 * Inject authenticated session user into METRON MCP tools.
 * Spec: specs/domain/assistant-metron-mcp.md
 */
import type { AssistantPageContext } from '@/lib/assistant/page-context';

function needsPlatformProjectId(toolName: string): boolean {
  return /metron[._](datasets_list|kpis_list|dashboards_list|dashboard_create|kpi_starter_pack_install|suite_connectors_sync)$/i.test(
    toolName,
  );
}

export function injectMetronToolArgs(
  toolName: string,
  input: Record<string, unknown>,
  ctx: {
    actorUserId: string;
    pageContext?: AssistantPageContext | null;
    platformProjectId?: string | null;
  },
): Record<string, unknown> {
  if (!/^metron[._]/.test(toolName)) return input;
  if (/^metron[._]health$/.test(toolName)) return input;
  const out = { ...input };
  if (ctx.actorUserId.trim()) {
    out.actorUserId = ctx.actorUserId.trim();
  }

  if (needsPlatformProjectId(toolName)) {
    const existing =
      typeof out.platformProjectId === 'string' ? out.platformProjectId.trim() : '';
    if (!existing) {
      const fromPage = ctx.pageContext?.platformProjectId?.trim() || '';
      const fromConv = ctx.platformProjectId?.trim() || '';
      const id = fromPage || fromConv;
      if (id) out.platformProjectId = id;
    }
  }

  return out;
}
