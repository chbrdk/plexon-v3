import { describe, expect, it } from 'vitest';
import {
  asLabelList,
  formatReportGeneratedAt,
  humanizeTraitKey,
  truncateReportText,
} from '@/lib/assistant/reports/format-report-text';

describe('format-report-text', () => {
  it('truncates long issue titles', () => {
    const long = 'A'.repeat(150);
    expect(truncateReportText(long, 120).length).toBeLessThanOrEqual(120);
    expect(truncateReportText(long, 120).endsWith('…')).toBe(true);
  });

  it('humanizes trait keys in German', () => {
    expect(humanizeTraitKey('detail_oriented')).toBe('Detail-orientiert');
    expect(humanizeTraitKey('pragmatic')).toBe('Pragmatisch');
  });

  it('extracts labels from object arrays', () => {
    expect(asLabelList([{ label: 'Goal A' }, { title: 'Goal B' }])).toEqual(['Goal A', 'Goal B']);
  });

  it('formats valid generatedAt and rejects invalid values', () => {
    expect(formatReportGeneratedAt('2026-06-15T10:00:00.000Z')).toMatch(/15/);
    expect(formatReportGeneratedAt('')).toBeNull();
    expect(formatReportGeneratedAt('not-a-date')).toBeNull();
  });
});
