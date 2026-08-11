/** Generative UI block types for the PLEXON assistant. */

export const UI_LAYOUT_VERSION = 1 as const;

export const UI_BLOCK_LIMITS = {
  maxBlocks: 12,
  maxPanelBlocks: 20,
  maxTableRows: 50,
  maxMetrics: 8,
  maxLinks: 12,
  maxKeyValues: 24,
  maxPersonas: 6,
  maxTargetGroups: 8,
  maxCornerTabs: 6,
  maxSteps: 24,
  maxChartLabels: 24,
  maxChartSeries: 4,
  maxFindings: 12,
  maxRecommendations: 16,
  maxPhases: 16,
  maxMoments: 32,
  maxQuotes: 16,
  maxColorSwatches: 24,
  maxFontSpecimens: 12,
  maxString: 2000,
  maxShort: 256,
} as const;

export const UI_BLOCK_TYPES = [
  'text',
  'metric_grid',
  'data_table',
  'key_value_list',
  'color_swatch_grid',
  'font_specimen_list',
  'alert',
  'link_list',
  'persona_card',
  'summary_card',
  'step_list',
  'corner_tab_section',
  'target_group_card',
  'chart',
  'collapsible',
  'finding_list',
  'recommendation_list',
  'phase_strip',
  'moment_list',
  'quote_list',
  'event_quick_check_report',
  'event_quick_check_review_gate',
] as const;

export type UiBlockType = (typeof UI_BLOCK_TYPES)[number];

export type UiTone = 'neutral' | 'success' | 'warning' | 'error' | 'info';

export type UiStepStatus = 'pending' | 'running' | 'done' | 'error';

export type UiBlock = {
  id: string;
  type: UiBlockType;
  props: Record<string, unknown>;
  meta?: {
    source?: 'plexon_ui';
    toolCallId?: string;
    createdAt?: string;
  };
};

export type UiPanelState = {
  open: boolean;
  title?: string;
  blocks: UiBlock[];
};

export type UiLayout = {
  version: typeof UI_LAYOUT_VERSION;
  blocks: UiBlock[];
  panel?: UiPanelState;
};

export function emptyUiLayout(): UiLayout {
  return { version: UI_LAYOUT_VERSION, blocks: [] };
}
