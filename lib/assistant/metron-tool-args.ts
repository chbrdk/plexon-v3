/**
 * Inject authenticated session user into METRON MCP tools.
 * Spec: specs/domain/assistant-metron-mcp.md
 */
import type { AssistantPageContext } from '@/lib/assistant/page-context';

function needsPlatformProjectId(toolName: string): boolean {
  return /metron[._](datasets_list|kpis_list|dashboards_list|dashboard_create|kpi_create|kpi_starter_pack_install|suite_connectors_sync|external_connections_list|company_kpi_library_bind)$/i.test(
    toolName,
  );
}

function needsPlatformCompanyId(toolName: string): boolean {
  return /metron[._]company_kpi_library_list$/i.test(toolName);
}

function needsEntityId(toolName: string): boolean {
  return /metron[._](dashboard_get|dashboard_summarize|kpi_get|kpi_evaluate|kpi_summarize|dataset_get|external_connection_sync|company_kpi_library_bind)$/i.test(
    toolName,
  );
}

function entityTypeForTool(toolName: string): string | null {
  const n = toolName.replace(/\./g, '_').toLowerCase();
  if (n.includes('dashboard_')) return 'dashboard';
  if (n.includes('external_connection')) return 'external_connection';
  if (n.includes('company_kpi_library')) return 'company_kpi_template';
  if (n.includes('kpi_')) return 'kpi';
  if (n.includes('dataset_')) return 'dataset';
  return null;
}

export function injectMetronToolArgs(
  toolName: string,
  input: Record<string, unknown>,
  ctx: {
    actorUserId: string;
    pageContext?: AssistantPageContext | null;
    platformProjectId?: string | null;
    platformCompanyId?: string | null;
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

  if (needsPlatformCompanyId(toolName)) {
    const existing =
      typeof out.platformCompanyId === 'string' ? out.platformCompanyId.trim() : '';
    if (!existing) {
      const fromPage = ctx.pageContext?.platformCompanyId?.trim() || '';
      const fromConv = ctx.platformCompanyId?.trim() || '';
      const id = fromPage || fromConv;
      if (id) out.platformCompanyId = id;
    }
  }

  if (needsEntityId(toolName)) {
    const existing = typeof out.id === 'string' ? out.id.trim() : '';
    if (!existing) {
      const want = entityTypeForTool(toolName);
      const pageType = ctx.pageContext?.entityType?.trim() || '';
      const pageId = ctx.pageContext?.entityId?.trim() || '';
      if (want && pageType === want && pageId) {
        out.id = pageId;
      }
    }
  }

  return out;
}
