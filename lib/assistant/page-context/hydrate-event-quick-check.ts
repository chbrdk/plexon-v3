import type { RequestUser } from '@/lib/auth-request-user'
import {
  ASSISTANT_CAPABILITY_CREATION_EDITOR,
  ASSISTANT_CAPABILITY_EVENT_QUICK_CHECK,
  ASSISTANT_ENTITY_COMPOSITION_SCENE,
  ASSISTANT_ENTITY_EVENT_QUICK_CHECK_RUN,
  ASSISTANT_MAX_PAGE_CONTEXT_CHARS,
  buildPageContextRouteHint,
  type AssistantPageContext,
} from '@/lib/assistant/page-context'
import { truncateAssistantText } from '@/lib/assistant/context-budget'
import { getAssistantWorkflowRunById } from '@/lib/db/assistant-workflow-runs'
import { userCanAccessEventQuickCheckRun } from '@/lib/assistant/event-quick-check/authorize-event-quick-check-run'
import { EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY } from '@/lib/paths/event-quick-check-page'
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types'

function asReport(raw: unknown): EventQuickCheckReportModel | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (row.templateId !== 'event_quick_check') return null
  if (!row.meta || typeof row.meta !== 'object') return null
  return raw as EventQuickCheckReportModel
}

function compactEqcReport(report: EventQuickCheckReportModel): string[] {
  const lines: string[] = []
  lines.push(`- Titel: ${report.meta.title}`)
  lines.push(`- URL: ${report.meta.url}`)
  lines.push(`- Domain: ${report.meta.domain}`)
  if (report.meta.projectName) lines.push(`- Projektname: ${report.meta.projectName}`)
  if (report.meta.platformProjectId) {
    lines.push(`- platformProjectId: ${report.meta.platformProjectId}`)
  }
  if (report.executive.summary?.trim()) {
    lines.push(`- Executive Summary: ${report.executive.summary.trim().slice(0, 500)}`)
  }
  if (report.executive.fazit?.trim()) {
    lines.push(`- Fazit: ${report.executive.fazit.trim().slice(0, 400)}`)
  }
  if (report.executive.kpiTiles?.length) {
    const kpis = report.executive.kpiTiles
      .slice(0, 8)
      .map((k) => `${k.label}=${k.value}${k.unit ? k.unit : ''}`)
      .join('; ')
    lines.push(`- KPIs: ${kpis}`)
  }
  if (report.domain) {
    lines.push(
      `- Domain-Scan: score ${report.domain.score}, pages ${report.domain.totalPages}, status ${report.domain.status}, scanId ${report.domain.scanId}`
    )
    const issues = report.domain.topIssues?.slice(0, 5) ?? []
    if (issues.length) {
      lines.push(
        `- Top Issues: ${issues.map((i) => `${i.title} (${i.count})`).join('; ')}`
      )
    }
  }
  const findings = report.insights?.findings?.slice(0, 5) ?? []
  if (findings.length) {
    lines.push(
      `- Findings: ${findings.map((f) => f.title || f.description?.slice(0, 80) || '').filter(Boolean).join('; ')}`
    )
  }
  const recs = report.insights?.recommendations?.slice(0, 5) ?? []
  if (recs.length) {
    lines.push(
      `- Empfehlungen: ${recs.map((r) => r.title).filter(Boolean).join('; ')}`
    )
  }
  if (report.appendix.scanId) lines.push(`- appendix.scanId: ${report.appendix.scanId}`)
  return lines
}

function isCreationEditorContext(pageContext: AssistantPageContext): boolean {
  return (
    pageContext.product === 'creation' &&
    (pageContext.capability === ASSISTANT_CAPABILITY_CREATION_EDITOR ||
      pageContext.entityType === ASSISTANT_ENTITY_COMPOSITION_SCENE ||
      pageContext.pathname.startsWith('/editor'))
  )
}

function buildCreationEditorContextBlock(pageContext: AssistantPageContext): string {
  const lines = [
    '## Aktueller Seitenkontext — CREATION Editor',
    `- pathname: ${pageContext.pathname}`,
  ]
  if (pageContext.platformProjectId) {
    lines.push(`- platformProjectId: ${pageContext.platformProjectId}`)
  }
  if (pageContext.entityType === ASSISTANT_ENTITY_COMPOSITION_SCENE && pageContext.entityId) {
    lines.push(`- sceneId: ${pageContext.entityId}`)
  }
  if (pageContext.entityUpdatedAt) {
    lines.push(`- baseUpdatedAt: ${pageContext.entityUpdatedAt}`)
  }
  lines.push(
    'Der Nutzer bearbeitet diese Composition-Scene im CREATION-Editor.',
    'Scene-Tree wird bei Scene-Edit-Turns vorab als Outline geladen — creation_scene_tree_index nur bei Bedarf erneut.',
    'sceneId und baseUpdatedAt stehen oben — den Nutzer NIEMALS nach der Scene-ID fragen.',
    'Neue Seite/Zeichenfläche: add_page { name? } zuerst (aktiviert die neue Page) → Response/Tree lesen (root.id) → dann Inhalte. Auch set_active_page / rename_page / duplicate_page / delete_page / move_node_to_page.',
    'Insert: insert_child { parentId, child: { id, type, name?, props? } } — Button type=Button, props.children=Label, props.href=Link. Oder insert_instance { masterId, parentId } mit Master-ID aus Tree-Outline. Niemals insert_node / add_instance / append_child.',
    'Bei expliziter Änderungsbitte (einfügen, ändern, bauen, neue Seite): creation_scene_apply_ops mit sceneId und baseUpdatedAt aus diesem Kontext.',
  )
  return lines.join('\n')
}

/**
 * Build system-prompt block for the current host page.
 * EQC runs are authorized and summarized; other pages get a route hint only.
 */
export async function buildAssistantPageContextBlock(
  user: RequestUser,
  pageContext: AssistantPageContext | null | undefined
): Promise<string | null> {
  if (!pageContext) return null

  const isEqc =
    pageContext.capability === ASSISTANT_CAPABILITY_EVENT_QUICK_CHECK ||
    pageContext.entityType === ASSISTANT_ENTITY_EVENT_QUICK_CHECK_RUN ||
    pageContext.pathname.startsWith('/event-quick-check')

  if (
    isEqc &&
    pageContext.entityType === ASSISTANT_ENTITY_EVENT_QUICK_CHECK_RUN &&
    pageContext.entityId
  ) {
    const run = await getAssistantWorkflowRunById(pageContext.entityId)
    if (!run || !(await userCanAccessEventQuickCheckRun(user, run))) {
      return truncateAssistantText(
        buildPageContextRouteHint(pageContext),
        ASSISTANT_MAX_PAGE_CONTEXT_CHARS,
        'Seitenkontext'
      )
    }

    const result = run.result ?? {}
    const report = asReport(result[EVENT_QUICK_CHECK_RUN_RESULT_REPORT_KEY])
    const lines = [
      '## Aktueller Seitenkontext — Event Quick Check',
      `- workflowRunId: ${run.id}`,
      `- status: ${run.status}`,
      `- type: ${run.type}`,
    ]
    if (pageContext.platformProjectId) {
      lines.push(`- platformProjectId (Host): ${pageContext.platformProjectId}`)
    }
    if (report) {
      lines.push(...compactEqcReport(report))
    } else {
      lines.push('- Report noch nicht vollständig im Run gespeichert.')
      const url = typeof result.url === 'string' ? result.url : null
      if (url) lines.push(`- URL (run.result): ${url}`)
    }
    lines.push(
      'Der Nutzer hat diesen Quick Check geöffnet. Beantworte Fragen dazu mit diesem Kontext; lade Tools nur wenn Details fehlen.'
    )
    return truncateAssistantText(lines.join('\n'), ASSISTANT_MAX_PAGE_CONTEXT_CHARS, 'Seitenkontext')
  }

  if (
    isCreationEditorContext(pageContext) &&
    pageContext.entityType === ASSISTANT_ENTITY_COMPOSITION_SCENE &&
    pageContext.entityId
  ) {
    return truncateAssistantText(
      buildCreationEditorContextBlock(pageContext),
      ASSISTANT_MAX_PAGE_CONTEXT_CHARS,
      'Seitenkontext',
    )
  }

  if (isEqc || pageContext.capability || pageContext.entityId) {
    return truncateAssistantText(
      buildPageContextRouteHint(pageContext),
      ASSISTANT_MAX_PAGE_CONTEXT_CHARS,
      'Seitenkontext'
    )
  }

  return truncateAssistantText(
    buildPageContextRouteHint(pageContext),
    Math.min(1_500, ASSISTANT_MAX_PAGE_CONTEXT_CHARS),
    'Seitenkontext'
  )
}
