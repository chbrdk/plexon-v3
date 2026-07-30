import { describe, expect, it } from 'vitest';
import {
  buildPageSpeedLayout,
  buildScanResultLayout,
} from '@/lib/assistant/ui-blocks/build-scan-result-ui';

const sampleScan = {
  id: 'scan-1',
  url: 'https://example.com',
  score: 85,
  stats: { errors: 2, warnings: 5, notices: 1, total: 8 },
  issues: [
    { code: 'WCAG2AA.H37', type: 'error', message: 'Missing alt', selector: 'img.hero' },
  ],
};

describe('buildScanResultLayout', () => {
  it('includes metric_grid, data_table, link_list', () => {
    const layout = buildScanResultLayout(sampleScan);
    const types = layout.blocks.map((b) => b.type);
    expect(types).toContain('metric_grid');
    expect(types).toContain('data_table');
    expect(types).toContain('link_list');
  });
});

describe('buildPageSpeedLayout', () => {
  it('includes metric_grid and chart', () => {
    const layout = buildPageSpeedLayout({
      url: 'https://example.com',
      performance: 90,
      accessibility: 88,
      bestPractices: 92,
      seo: 95,
    });
    const types = layout.blocks.map((b) => b.type);
    expect(types).toContain('metric_grid');
    expect(types).toContain('chart');
  });
});
