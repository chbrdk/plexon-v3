import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/paths/assistant-workflows', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/paths/assistant-workflows')>();
  return {
    ...actual,
    EVENT_QUICK_CHECK_ECHON_RESEARCH_ENABLED: true,
  };
});

import { buildEventQuickCheckReportModel } from '@/lib/assistant/reports/build-event-quick-check-report-model';
import { eventQuickCheckBvikFixture } from '@/__tests__/fixtures/event-quick-check-report.fixture';

describe('buildEventQuickCheckReportModel market section', () => {
  it('maps ECHON market context into report model', () => {
    const quick = eventQuickCheckBvikFixture();
    const withMarket = {
      ...quick,
      echonMarket: {
        available: true,
        threadId: 'thread-abc',
        runId: 'run-abc',
        query: 'Markt für bvik.org',
        executiveSummary: 'Digitalisierung im Verbandsmarkt beschleunigt.',
        keyFindings: ['Trend A', 'Trend B'],
        implications: 'Mehr Thought Leadership nötig.',
      },
      outcomes: [
        ...quick.outcomes,
        {
          stepId: 'echon_market_research',
          label: 'ECHON Markt-Research',
          status: 'done' as const,
          data: { findingCount: 2 },
        },
      ],
    };

    const model = buildEventQuickCheckReportModel(withMarket);
    expect(model.market?.status).toBe('complete');
    expect(model.market?.keyFindings).toHaveLength(2);
    expect(model.market?.executiveSummary).toContain('Digitalisierung');
    expect(model.executive.kpiTiles.some((k) => k.label === 'Markt-Signale')).toBe(true);
    expect(model.appendix.links.some((l) => l.label.includes('ECHON'))).toBe(true);
  });
});
