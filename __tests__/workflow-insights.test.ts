import { describe, expect, it } from 'vitest';
import { buildWorkflowFollowUps } from '@/lib/assistant/insights/follow-up-suggestions';
import {
  buildDomainScanCrossSignals,
  buildGeoCrossSignals,
  buildPlaybookCrossSignals,
  buildReadabilityCrossSignals,
  buildSslCrossSignals,
} from '@/lib/assistant/insights/cross-signals';
import { appendInsightBlocksToLayout } from '@/lib/assistant/insights/append-insight-blocks';
import { narrativeFromCrossSignals } from '@/lib/assistant/insights/generate-workflow-insights';
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types';

describe('workflow cross-signals', () => {
  it('builds GEO competitor and benchmark comparisons', () => {
    const signals = buildGeoCrossSignals(
      {
        jobId: 'j1',
        url: 'https://example.com',
        status: 'complete',
        overallScore: 62,
        competitors: [
          { name: 'A', score: 80 },
          { name: 'B', score: 70 },
        ],
        keywords: ['ai search', 'brand trust'],
      },
      {
        pageSpeed: {
          url: 'https://example.com',
          performance: 55,
          accessibility: 88,
          bestPractices: 90,
          seo: 82,
        },
      },
      'SEO-Keywords: ai search; brand visibility'
    );

    expect(signals.some((s) => s.id === 'geo-vs-market')).toBe(true);
    expect(signals.some((s) => s.id === 'geo-psi-seo')).toBe(true);
    expect(signals.some((s) => s.category === 'Quervergleich')).toBe(true);
  });

  it('builds playbook spread signal', () => {
    const signals = buildPlaybookCrossSignals({
      ok: true,
      playbookId: 'website_audit',
      playbookLabel: 'Website-Audit',
      url: 'https://example.com',
      outcomes: [
        {
          stepId: 'pagespeed',
          kind: 'pagespeed_check',
          label: 'PageSpeed',
          status: 'done',
          payload: {
            kind: 'pagespeed_check',
            data: { url: 'https://example.com', performance: 90, accessibility: 85, bestPractices: 88, seo: 80 },
          },
        },
        {
          stepId: 'quick_scan',
          kind: 'quick_scan',
          label: 'Scan',
          status: 'done',
          payload: {
            kind: 'quick_scan',
            data: {
              id: 'scan-1',
              url: 'https://example.com',
              score: 55,
              stats: { errors: 4, warnings: 2, notices: 0, total: 6 },
              issues: [],
            },
          },
        },
      ],
      steps: [],
    });
    expect(signals.some((s) => s.id === 'playbook-spread')).toBe(true);
  });

  it('builds domain and ssl cross signals', () => {
    const domain = buildDomainScanCrossSignals({
      id: 'd1',
      domain: 'example.com',
      url: 'https://example.com',
      status: 'complete',
      totalPages: 40,
      score: 58,
      stats: { errors: 5, warnings: 2, notices: 0, total: 7 },
      topIssues: [{ title: 'Missing alt', count: 8 }],
    });
    expect(domain.some((s) => s.id === 'domain-top-issue')).toBe(true);

    const ssl = buildSslCrossSignals({ host: 'example.com', grade: 'C', status: 'READY' });
    expect(ssl.some((s) => s.id === 'ssl-grade')).toBe(true);

    const readability = buildReadabilityCrossSignals({
      url: 'https://example.com',
      score: 13,
      grade: 'schwer',
      stats: { sentences: 20, words: 500, syllables: 800 },
    });
    expect(readability.some((s) => s.id === 'readability-hard')).toBe(true);
  });

  it('suggests continuation after weak geo', () => {
    const signals = buildGeoCrossSignals({
      jobId: 'j1',
      url: 'https://example.com',
      status: 'complete',
      overallScore: 50,
      competitors: [{ name: 'Rival', score: 80 }],
      keywords: [],
    });
    const followUps = buildWorkflowFollowUps({
      workflowType: 'geo_analysis',
      url: 'https://example.com',
      crossSignals: signals,
    });
    expect(followUps.some((f) => f.id === 'next-pagespeed')).toBe(true);
    expect(followUps.some((f) => f.prompt.includes('ohne GEO'))).toBe(true);
  });
});

describe('appendInsightBlocksToLayout', () => {
  it('appends analyst blocks after data blocks', () => {
    const dataLayout = {
      version: UI_LAYOUT_VERSION,
      blocks: [
        {
          id: 'data-1',
          type: 'metric_grid' as const,
          props: { title: 'Scan', items: [{ label: 'Score', value: 80 }] },
        },
      ],
    };
    const narrative = narrativeFromCrossSignals(
      [
        {
          id: 'x',
          category: 'GEO',
          severity: 'warning',
          title: 'Test',
          fact: 'Fact line',
        },
      ],
      'GEO'
    );
    const out = appendInsightBlocksToLayout(dataLayout, narrative);
    expect(out.blocks.length).toBeGreaterThan(dataLayout.blocks.length);
    expect(out.blocks.some((b) => b.type === 'finding_list')).toBe(true);
    expect(out.blocks.some((b) => b.type === 'recommendation_list' || b.type === 'alert')).toBe(true);
  });
});
