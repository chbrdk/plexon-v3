import { MSQDX_TYPOGRAPHY } from '@msqdx/tokens';
import type { BrandColor } from '@msqdx/react';
import type { UiAccent } from '@/lib/assistant/ui-visual';
import type { UiBlockType, UiTone } from '@/lib/assistant/ui-blocks/types';
import { UI_TONE_BRAND } from '@/lib/assistant/ui-visual';

/** MSQDX primary — Noto Sans (see `@msqdx/tokens`). */
export const UI_FONT_SANS = MSQDX_TYPOGRAPHY.fontFamily.primary;
export const UI_FONT_MONO = 'var(--font-ui-mono)';

export const uiSansTitleSx = {
  fontFamily: UI_FONT_SANS,
  fontWeight: MSQDX_TYPOGRAPHY.fontWeight.semibold,
  lineHeight: MSQDX_TYPOGRAPHY.lineHeight.tight,
  color: 'var(--color-text-on-light)',
  letterSpacing: MSQDX_TYPOGRAPHY.letterSpacing.tight,
} as const;

export const uiSansBodySx = {
  fontFamily: UI_FONT_SANS,
  fontWeight: MSQDX_TYPOGRAPHY.fontWeight.regular,
  lineHeight: MSQDX_TYPOGRAPHY.lineHeight.relaxed,
  color: 'var(--color-text-on-light)',
} as const;

export const uiSansDisplaySx = {
  ...uiSansTitleSx,
  fontSize: MSQDX_TYPOGRAPHY.fontSize['2xl'],
} as const;

export const uiMonoLabelSx = {
  fontFamily: UI_FONT_MONO,
  fontSize: MSQDX_TYPOGRAPHY.fontSize.xs,
  fontWeight: MSQDX_TYPOGRAPHY.fontWeight.semibold,
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'var(--color-text-muted-on-light)',
} as const;

export const uiMonoStatSx = {
  fontFamily: UI_FONT_MONO,
  fontWeight: MSQDX_TYPOGRAPHY.fontWeight.bold,
  lineHeight: MSQDX_TYPOGRAPHY.lineHeight.tight,
  color: 'var(--color-text-on-light)',
} as const;

/** Material Symbols icon per generative UI block type. */
export const UI_BLOCK_ICONS: Record<UiBlockType, string> = {
  text: 'article',
  alert: 'info',
  metric_grid: 'dashboard',
  key_value_list: 'list_alt',
  data_table: 'table_chart',
  link_list: 'link',
  persona_card: 'face',
  summary_card: 'summarize',
  step_list: 'route',
  corner_tab_section: 'tab',
  target_group_card: 'groups',
  chart: 'bar_chart',
  collapsible: 'unfold_more',
  finding_list: 'fact_check',
  recommendation_list: 'task_alt',
  event_quick_check_report: 'assignment',
  event_quick_check_review_gate: 'fact_check',
};

export function uiBlockIconForTone(tone: UiTone): string {
  switch (tone) {
    case 'success':
      return 'check_circle';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    default:
      return 'info';
  }
}

export function uiBlockBrandForTone(tone: UiTone): UiAccent {
  return UI_TONE_BRAND[tone] ?? 'neutral';
}
