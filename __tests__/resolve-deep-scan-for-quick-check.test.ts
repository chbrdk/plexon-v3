import { describe, expect, it } from 'vitest';
import { mergeDeepScanIntoOutcomes } from '@/lib/assistant/event-quick-check/resolve-deep-scan-for-quick-check';

describe('mergeDeepScanIntoOutcomes', () => {
  it('patches domain_scan outcome with competitor data', () => {
    const outcomes = [
      {
        stepId: 'domain_scan',
        label: 'Domain-Scan',
        status: 'done' as const,
        data: { background: true },
      },
    ];
    const merged = mergeDeepScanIntoOutcomes(outcomes, {
      domainScan: { id: 'scan-1', url: 'https://a.de', score: 80, totalPages: 10 },
      competitorScans: { 'b.de': { id: 'scan-2', url: 'https://b.de', score: 70, totalPages: 8 } },
      failed: [],
      allComplete: true,
      progress: { complete: 2, total: 2, detail: '2/2' },
    });
    expect(merged[0].data?.ownScanId).toBe('scan-1');
    expect(merged[0].data?.competitorScans).toHaveProperty('b.de');
  });
});
