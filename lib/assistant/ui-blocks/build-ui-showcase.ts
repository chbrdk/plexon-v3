import { randomUUID } from 'crypto';
import type { UiBlock, UiLayout } from '@/lib/assistant/ui-blocks/types';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';
import { pathPlatformProjectDashboard } from '@/lib/constants';

function block(
  type: Parameters<typeof createUiBlock>[0],
  props: Parameters<typeof createUiBlock>[1]
): UiBlock {
  const result = createUiBlock(type, props, randomUUID());
  if (!result.ok) throw new Error(result.error);
  return result.block;
}

/** Demo layout with every generative UI block type (for showcase / QA). */
export function buildAssistantUiShowcaseLayout(): UiLayout {
  const demoProjectId = 'demo-project';

  const blocks: UiBlock[] = [
    block('text', {
      markdown:
        '**Generative UI Showcase** — alle `plexon_ui`-Block-Typen mit MSQDX Design System.',
    }),
    block('alert', {
      title: 'Alert',
      message: 'Status-Hinweise mit tone: success, warning, error, info.',
      tone: 'info',
    }),
    block('metric_grid', {
      title: 'Metric Grid',
      items: [
        { label: 'PageSpeed', value: 92, unit: '/100', tone: 'success' },
        { label: 'Scans', value: 12, hint: 'CHECKION' },
        { label: 'Personas', value: 4, hint: 'AUDION' },
      ],
    }),
    block('key_value_list', {
      title: 'Key-Value List',
      items: [
        { label: 'Projekt', value: 'Demo Website' },
        { label: 'Domain', value: 'example.com' },
        { label: 'Status', value: 'Aktiv' },
      ],
    }),
    block('data_table', {
      title: 'Data Table',
      columns: ['Seite', 'Score', 'Issues'],
      rows: [
        ['/', 94, 2],
        ['/produkte', 88, 5],
        ['/kontakt', 91, 1],
      ],
    }),
    block('link_list', {
      title: 'Link List',
      links: [
        { label: 'PLEXON Dashboard', href: pathPlatformProjectDashboard(demoProjectId) },
        { label: 'MSQDX', href: 'https://msqdx.com', external: true },
      ],
    }),
    block('summary_card', {
      title: 'Summary Card',
      checkionScanCount: 12,
      audionPersonaCount: 4,
      links: [{ label: 'Dashboard', href: pathPlatformProjectDashboard(demoProjectId) }],
    }),
    block('step_list', {
      title: 'Step List',
      steps: [
        { id: 's1', label: 'Research', status: 'done' },
        { id: 's2', label: 'Personas', status: 'running', progress: 60 },
        { id: 's3', label: 'Journey', status: 'pending' },
      ],
    }),
    block('chart', {
      title: 'Chart',
      chartType: 'bar',
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: [{ label: 'Visibility', values: [72, 81, 78, 88] }],
      yAxisLabel: 'Score',
    }),
    block('persona_card', {
      title: 'Persona Card',
      personas: [
        {
          id: 'p1',
          name: 'Anna',
          segment: 'Eltern 30–40',
          confidence: 0.91,
          headline: 'Zeitoptimierte Familienmanagerin',
        },
      ],
    }),
    block('target_group_card', {
      title: 'Target Group Card',
      targetGroups: [
        {
          id: 'tg1',
          name: 'Young Families',
          segment: 'B2C',
          description: 'Eltern mit Kindern unter 10',
          personaCount: 3,
          knowledgeEntryCount: 24,
        },
      ],
    }),
    block('corner_tab_section', {
      tabLabel: 'Details',
      title: 'Corner Tab Section',
      markdown: 'Zusatzinfos in einer **MsqdxCornerTabSection** — z. B. Methodik oder Quellen.',
      placement: 'top-right',
    }),
    block('phase_strip', {
      title: 'Journey outline',
      phases: [
        { id: 'ph1', label: 'Awareness', summary: 'Erste Berührung', status: 'done' },
        {
          id: 'ph2',
          label: 'Consideration',
          summary: 'Vergleicht Anbieter',
          active: true,
          status: 'current',
        },
        { id: 'ph3', label: 'Decision', status: 'upcoming' },
      ],
    }),
    block('moment_list', {
      title: 'Consideration · Moments',
      items: [
        { id: 'm1', kind: 'thought', label: 'Passt das zu unserem Stack?' },
        { id: 'm2', kind: 'pain', label: 'Zu viele Formularfelder' },
        { id: 'm3', kind: 'opportunity', label: 'FAQ mit Citations' },
      ],
    }),
    block('quote_list', {
      title: 'Persona-Stimmen',
      items: [
        {
          quote: 'Ich brauche Citations, sonst vertraue ich dem Anbieter nicht.',
          attribution: 'Alex · Consideration',
          context: 'Friction: fehlende Quellen',
          tone: 'warning',
        },
      ],
    }),
  ];

  return { version: UI_LAYOUT_VERSION, blocks };
}

export const ASSISTANT_UI_SHOWCASE_INTRO =
  'Hier sind alle verfügbaren **Generative-UI-Blöcke** (MSQDX Design System):';
