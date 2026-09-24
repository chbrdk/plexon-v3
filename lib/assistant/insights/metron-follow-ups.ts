/**
 * Follow-ups after METRON dashboard Auto-UI turns.
 * Spec: specs/domain/assistant-metron-mcp.md § Follow-up prompts
 */

import type { ConversationRecommendation } from '@/lib/assistant/insights/follow-up-suggestions';
import type { UiLayout } from '@/lib/assistant/ui-blocks/types';

export type MetronFollowUpMode = 'list' | 'detail' | 'generic';

function hasMetronShareSnapshot(uiLayout: unknown): boolean {
  if (!uiLayout || typeof uiLayout !== 'object') return false;
  const blocks = (uiLayout as UiLayout).blocks;
  if (!Array.isArray(blocks)) return false;
  return blocks.some((b) => Boolean(b?.meta?.metronShareSnapshot));
}

function metronToolsFromTrace(toolTrace: unknown): string[] {
  if (!toolTrace || typeof toolTrace !== 'object') return [];
  const tools = (toolTrace as { tools?: unknown }).tools;
  if (!Array.isArray(tools)) return [];
  return tools
    .filter((t): t is string => typeof t === 'string')
    .map((t) => t.toLowerCase().replace(/\./g, '_'))
    .filter((t) => t.includes('metron'));
}

export function resolveMetronFollowUpMode(metadata: Record<string, unknown>): MetronFollowUpMode | null {
  const tools = metronToolsFromTrace(metadata.toolTrace);
  if (
    tools.some(
      (t) =>
        t.includes('dashboard_get') ||
        t.includes('dashboard_summarize') ||
        t.includes('kpi_evaluate') ||
        t.includes('kpi_summarize') ||
        t.includes('kpi_get'),
    )
  ) {
    return 'detail';
  }
  if (
    tools.some(
      (t) =>
        t.includes('dashboards_list') ||
        t.includes('dashboard_list') ||
        t.includes('kpis_list') ||
        t.includes('datasets_list'),
    )
  ) {
    return 'list';
  }
  if (hasMetronShareSnapshot(metadata.uiLayout)) return 'detail';

  const planner = metadata.planner as { intent?: string } | undefined;
  if (planner?.intent === 'metron_analytics') return 'generic';
  return null;
}

function firstDashboardName(uiLayout: unknown): string | null {
  if (!uiLayout || typeof uiLayout !== 'object') return null;
  const blocks = (uiLayout as UiLayout).blocks;
  if (!Array.isArray(blocks)) return null;
  for (const b of blocks) {
    const snap = b.meta?.metronShareSnapshot;
    if (snap && typeof snap.name === 'string' && snap.name.trim()) return snap.name.trim();
    if (b.type === 'metric_grid' && typeof b.props?.title === 'string' && b.props.title.trim()) {
      return b.props.title.trim();
    }
  }
  return null;
}

/** Actionable next turns after METRON list / get / summarize. */
export function buildMetronFollowUps(options: {
  mode: MetronFollowUpMode;
  uiLayout?: unknown;
}): ConversationRecommendation[] {
  const name = firstDashboardName(options.uiLayout);
  const showLabel = name ? `Zeige ${name}` : 'Dashboard öffnen';
  const showPrompt = name
    ? `Zeig mir das METRON Dashboard „${name}“ mit KPIs und Chart`
    : 'Zeig mir das wichtigste METRON Dashboard dieser Collection mit KPIs und Chart';

  if (options.mode === 'list') {
    return [
      {
        id: 'metron-show-board',
        label: showLabel,
        prompt: showPrompt,
        reason: 'Board als Metric-Grid + Chart im Chat',
      },
      {
        id: 'metron-eval-kpi',
        label: 'KPI evaluieren',
        prompt: 'Evaluiere den wichtigsten METRON-KPI dieser Collection (Server-SSOT)',
        reason: 'kpi_evaluate statt schätzen',
      },
      {
        id: 'metron-summarize',
        label: 'Zusammenfassen',
        prompt: 'Fasse die METRON Dashboards dieser Collection kurz zusammen',
        reason: 'Teaser ohne Builder',
      },
      {
        id: 'metron-starter-pack',
        label: 'Starter-Pack',
        prompt: 'Installiere das METRON KPI Starter Pack für diese Collection (mit Bestätigung)',
        reason: 'Confirm-Write sichtbar machen',
      },
      {
        id: 'metron-create-dash',
        label: 'Dashboard anlegen',
        prompt: 'Erstelle ein Overview-Dashboard in METRON für diese Collection (mit Bestätigung)',
        reason: 'Confirm-Write sichtbar machen',
      },
    ];
  }

  if (options.mode === 'detail') {
    return [
      {
        id: 'metron-other-board',
        label: 'Andere Boards',
        prompt: 'Liste alle METRON Dashboards dieser Collection',
        reason: 'Zurück zur Übersicht',
      },
      {
        id: 'metron-eval-kpi',
        label: 'KPI evaluieren',
        prompt: 'Evaluiere den zugehörigen METRON-KPI mit metron_kpi_evaluate',
        reason: 'Server-SSOT Wert',
      },
      {
        id: 'metron-starter-pack',
        label: 'Starter-Pack',
        prompt: 'Installiere das METRON KPI Starter Pack für diese Collection (mit Bestätigung)',
        reason: 'Confirm-Write sichtbar machen',
      },
      {
        id: 'metron-suite-sync',
        label: 'Suite sync',
        prompt: 'Synchronisiere die METRON Suite-Connectors für diese Collection (mit Bestätigung)',
        reason: 'Confirm-Write sichtbar machen',
      },
    ];
  }

  return [
    {
      id: 'metron-list',
      label: 'Dashboards listen',
      prompt: 'Liste die METRON Dashboards dieser Collection',
      reason: 'Einstieg in METRON Analytics',
    },
    {
      id: 'metron-eval-kpi',
      label: 'KPI evaluieren',
      prompt: 'Liste METRON-KPIs und evaluiere den wichtigsten (Server-SSOT)',
      reason: 'Evaluate-first Path',
    },
    {
      id: 'metron-starter-pack',
      label: 'Starter-Pack',
      prompt: 'Installiere das METRON KPI Starter Pack für diese Collection (mit Bestätigung)',
      reason: 'Confirm-Write sichtbar machen',
    },
  ];
}
