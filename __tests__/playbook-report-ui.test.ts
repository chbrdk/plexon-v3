import { describe, expect, it } from 'vitest';
import { buildPlaybookReportLayout } from '@/lib/assistant/ui-blocks/build-playbook-report-ui';
import type { PlaybookRunResult } from '@/lib/assistant/playbooks/runner';
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate';

function sampleResult(): PlaybookRunResult {
  return {
    ok: true,
    playbookId: 'website_audit',
    playbookLabel: 'Website-Audit',
    url: 'https://example.com',
    steps: [],
    outcomes: [
      {
        stepId: 'pagespeed',
        kind: 'pagespeed_check',
        label: 'PageSpeed',
        status: 'done',
        payload: {
          kind: 'pagespeed_check',
          data: {
            url: 'https://example.com',
            performance: 90,
            accessibility: 88,
            bestPractices: 85,
            seo: 92,
          },
        },
      },
      {
        stepId: 'quick_scan',
        kind: 'quick_scan',
        label: 'Accessibility-Scan',
        status: 'done',
        payload: {
          kind: 'quick_scan',
          data: {
            id: 's1',
            url: 'https://example.com',
            score: 75,
            stats: { errors: 2, warnings: 1, notices: 0, total: 3 },
            issues: [],
          },
        },
      },
    ],
  };
}

describe('buildPlaybookReportLayout', () => {
  it('builds metric grid and chart', () => {
    const layout = buildPlaybookReportLayout(sampleResult());
    expect(layout.blocks.some((b) => b.type === 'metric_grid')).toBe(true);
    expect(layout.blocks.some((b) => b.type === 'chart')).toBe(true);
    expect(layout.blocks.some((b) => b.type === 'data_table')).toBe(true);
  });

  it('validates all blocks', () => {
    const layout = buildPlaybookReportLayout(sampleResult());
    for (const block of layout.blocks) {
      expect(createUiBlock(block.type, block.props, block.id).ok).toBe(true);
    }
  });
});
