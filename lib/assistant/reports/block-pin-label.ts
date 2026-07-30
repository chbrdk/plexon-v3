import type { UiBlock } from '@/lib/assistant/ui-blocks/types';
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy';

/** Short label for report cart list items. */
export function blockPinLabel(block: UiBlock): string {
  const title = typeof block.props.title === 'string' ? block.props.title.trim() : '';
  if (title) return title;

  switch (block.type) {
    case 'text':
      return 'Text';
    case 'metric_grid':
      return 'Metriken';
    case 'data_table':
      return 'Tabelle';
    case 'key_value_list':
      return 'Details';
    case 'alert':
      return 'Hinweis';
    case 'link_list':
      return 'Links';
    case 'persona_card':
      return 'Personas';
    case 'step_list':
      return 'Workflow';
    case 'summary_card':
      return 'Zusammenfassung';
    case 'corner_tab_section':
      return typeof block.props.tabLabel === 'string' ? block.props.tabLabel : 'Abschnitt';
    case 'target_group_card':
      return 'Zielgruppen';
    case 'chart':
      return 'Chart';
    case 'collapsible':
      return typeof block.props.title === 'string' ? block.props.title : 'Abschnitt';
    case 'finding_list':
      return 'Erkenntnisse';
    case 'recommendation_list':
      return 'Empfehlungen';
    case 'event_quick_check_report':
      return EQC_REPORT_COPY.reportPinLabel;
    default:
      return block.type;
  }
}

export function pinKey(messageId: string, blockId: string): string {
  return `${messageId}:${blockId}`;
}
