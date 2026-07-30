import { describe, expect, it } from 'vitest';
import { generateReportShareToken, hashReportShareToken } from '@/lib/assistant/reports/share-token';

describe('report share token', () => {
  it('generates rpt_ prefixed tokens', () => {
    const token = generateReportShareToken();
    expect(token.startsWith('rpt_')).toBe(true);
    expect(token.length).toBeGreaterThan(20);
  });

  it('hashes deterministically', () => {
    const a = hashReportShareToken('rpt_abc');
    const b = hashReportShareToken('rpt_abc');
    expect(a).toBe(b);
    expect(a).not.toBe('rpt_abc');
  });
});
