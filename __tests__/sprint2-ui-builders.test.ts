import { describe, expect, it } from 'vitest';
import { buildDomainScanLayout } from '@/lib/assistant/ui-blocks/build-domain-scan-ui';
import { buildContrastCheckLayout } from '@/lib/assistant/ui-blocks/build-contrast-ui';
import { buildReadabilityCheckLayout } from '@/lib/assistant/ui-blocks/build-readability-ui';
import { buildScanSummarizeLayout } from '@/lib/assistant/ui-blocks/build-scan-summary-ui';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';

describe('sprint2 ui builders', () => {
  it('builds domain scan layout', () => {
    const layout = buildDomainScanLayout({
      id: 'dom-1',
      domain: 'example.com',
      url: 'https://example.com',
      status: 'complete',
      totalPages: 5,
      score: 80,
      stats: { errors: 1, warnings: 2, notices: 0, total: 3 },
      topIssues: [{ title: 'Alt text', count: 2 }],
    });
    expect(layout.blocks.some((b) => b.type === 'metric_grid')).toBe(true);
  });

  it('validates contrast layout blocks', () => {
    const layout = buildContrastCheckLayout({
      ratio: 4.6,
      score: { aa: 'pass', aaa: 'fail', aaLarge: 'pass', aaaLarge: 'fail' },
      foreground: '000000',
      background: 'ffffff',
    });
    for (const block of layout.blocks) {
      expect(createUiBlock(block.type, block.props, block.id).ok).toBe(true);
    }
  });

  it('builds readability layout with chart', () => {
    const layout = buildReadabilityCheckLayout({
      url: 'https://example.com',
      score: 8.5,
      grade: 'Standard (High School)',
      stats: { sentences: 10, words: 200, syllables: 300 },
    });
    expect(layout.blocks.some((b) => b.type === 'chart')).toBe(true);
  });

  it('builds scan summarize layout', () => {
    const layout = buildScanSummarizeLayout({
      scanId: '550e8400-e29b-41d4-a716-446655440000',
      summary: 'Die Seite hat mehrere A11y-Probleme.',
      themes: [{ name: 'Kontrast', severity: 'high' }],
      recommendations: [{ title: 'Fix contrast', description: 'Increase ratio', priority: 1 }],
    });
    expect(layout.blocks.some((b) => b.type === 'text')).toBe(true);
  });
});
