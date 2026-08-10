import { describe, expect, it } from 'vitest';
import { buildEventQuickCheckReportModel } from '@/lib/assistant/reports/build-event-quick-check-report-model';
import { buildEventQuickCheckReportBlock } from '@/lib/assistant/reports/build-event-quick-check-report-block';
import { eventQuickCheckBvikFixture } from '@/__tests__/fixtures/event-quick-check-report.fixture';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';
import { createUiBlock, isUiBlockType, parseUiBlockProps } from '@/lib/assistant/ui-blocks/validate';

describe('ui-blocks validate', () => {
  it('recognizes block types', () => {
    expect(isUiBlockType('metric_grid')).toBe(true);
    expect(isUiBlockType('persona_card')).toBe(true);
    expect(isUiBlockType('unknown')).toBe(false);
  });

  it('validates metric_grid props', () => {
    const parsed = parseUiBlockProps('metric_grid', {
      title: 'Scores',
      items: [{ label: 'PageSpeed', value: 92, unit: 'pts', tone: 'success' }],
    });
    expect(parsed.ok).toBe(true);
  });

  it('rejects invalid persona confidence', () => {
    const parsed = parseUiBlockProps('persona_card', {
      personas: [
        {
          id: 'p1',
          name: 'Anna',
          segment: 'Eltern',
          confidence: 2,
          headline: 'Test',
        },
      ],
    });
    expect(parsed.ok).toBe(false);
  });

  it('rejects javascript URLs in link_list', () => {
    const parsed = parseUiBlockProps('link_list', {
      links: [{ label: 'Bad', href: 'javascript:alert(1)' }],
    });
    expect(parsed.ok).toBe(false);
  });

  it('validates event_quick_check_report block from fixture model', () => {
    const model = buildEventQuickCheckReportModel(eventQuickCheckBvikFixture());
    const block = buildEventQuickCheckReportBlock(model);
    expect(block.ok).toBe(true);
    if (!block.ok) return;
    const parsed = parseUiBlockProps('event_quick_check_report', block.block.props);
    expect(parsed.ok).toBe(true);
  });

  it('creates block with id', () => {
    const created = createUiBlock(
      'alert',
      { message: 'Hinweis', tone: 'info' },
      'block-1'
    );
    expect(created.ok).toBe(true);
    if (created.ok) {
      expect(created.block.id).toBe('block-1');
      expect(created.block.type).toBe('alert');
    }
  });

  it('strips emoticons from data_table cells', () => {
    const created = createUiBlock(
      'data_table',
      {
        title: 'Befunde 🚀',
        columns: ['Befund', 'Priorität'],
        rows: [['Domain-Score', '⚡ Mittel'], ['A11y', '🔴 Hoch']],
      },
      'table-1'
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const props = created.block.props as {
      title?: string
      columns: string[]
      rows: Array<Array<string | number | null>>
    };
    expect(props.title).toBe('Befunde');
    expect(props.rows[0]?.[1]).toBe('Mittel');
    expect(props.rows[1]?.[1]).toBe('Hoch');
    expect(JSON.stringify(props)).not.toMatch(/⚡|🔴|🚀/);
  });
});
