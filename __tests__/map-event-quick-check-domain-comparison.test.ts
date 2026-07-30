import { describe, expect, it } from 'vitest';
import type { EventQuickCheckResult } from '@/lib/assistant/playbooks/run-event-quick-check';
import { buildEventQuickCheckDomainComparisonSection } from '@/lib/assistant/reports/map-event-quick-check-domain-comparison';
import { eventQuickCheckBvikFixture } from '@/__tests__/fixtures/event-quick-check-report.fixture';

const scanPreview = (domain: string, score: number) => ({
  id: `scan-${domain}`,
  domain,
  url: `https://${domain}`,
  status: 'complete',
  totalPages: 100,
  score,
  stats: { errors: 5, warnings: 10, notices: 2, total: 17 },
  topIssues: [],
});

describe('buildEventQuickCheckDomainComparisonSection', () => {
  it('returns undefined when no competitor scans in outcomes', () => {
    expect(buildEventQuickCheckDomainComparisonSection(eventQuickCheckBvikFixture())).toBeUndefined();
  });

  it('builds rows for own + competitor domains', () => {
    const quick: EventQuickCheckResult = {
      ...eventQuickCheckBvikFixture(),
      checkionProjectId: 'chk-complete-1',
      outcomes: [
        ...eventQuickCheckBvikFixture().outcomes.filter((o) => o.stepId !== 'domain_scan'),
        {
          stepId: 'domain_scan',
          label: 'Domain-Scan',
          status: 'done',
          data: {
            ownScanId: 'scan-bvik-1',
            competitorScans: {
              'rival.de': scanPreview('rival.de', 72),
              'other.com': scanPreview('other.com', 65),
            },
            failed: ['broken.example: timeout'],
          },
        },
      ],
    };

    const section = buildEventQuickCheckDomainComparisonSection(quick);
    expect(section).toBeDefined();
    expect(section?.rows).toHaveLength(3);
    expect(section?.rows[0].role).toBe('own');
    expect(section?.rows[0].domain).toBe('bvik.org');
    expect(section?.checkionProjectId).toBe('chk-complete-1');
    expect(section?.checkionProjectHref).toContain('chk-complete-1');
    expect(section?.failedDomains).toEqual(['broken.example: timeout']);
  });
});

describe('buildEventQuickCheckReportModel domain comparison', () => {
  it('adds CHECKION project link when complete scan has competitors', async () => {
    const { buildEventQuickCheckReportModel } = await import(
      '@/lib/assistant/reports/build-event-quick-check-report-model'
    );
    const quick: EventQuickCheckResult = {
      ...eventQuickCheckBvikFixture(),
      checkionProjectId: 'chk-complete-1',
      outcomes: [
        ...eventQuickCheckBvikFixture().outcomes.filter((o) => o.stepId !== 'domain_scan'),
        {
          stepId: 'domain_scan',
          label: 'Domain-Scan',
          status: 'done',
          data: {
            competitorScans: { 'rival.de': scanPreview('rival.de', 70) },
          },
        },
      ],
    };
    const model = buildEventQuickCheckReportModel(quick);
    expect(model.domainComparison?.rows.length).toBe(2);
    expect(model.appendix.links.some((l) => l.label.includes('CHECKION'))).toBe(true);
  });
});
