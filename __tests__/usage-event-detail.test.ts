import { describe, it, expect } from 'vitest';
import { formatUsageEventDetail } from '@/lib/usage-event-detail';

describe('formatUsageEventDetail', () => {
  it('formats domain_scan_page with scan id, index, status, url', () => {
    const s = formatUsageEventDetail('domain_scan_page', {
      domain_scan_id: 'abc-123-def',
      page_index: 2,
      ok: true,
      url: 'https://example.com/very/long/path/to/page',
      pages: 1,
    });
    expect(s).toContain('Deep scan abc-123-def');
    expect(s).toContain('page #2');
    expect(s).toContain('ok');
    expect(s).toContain('example.com');
  });

  it('shows fail when ok is false', () => {
    expect(
      formatUsageEventDetail('domain_scan_page', {
        domain_scan_id: 'x',
        page_index: 0,
        ok: false,
        url: 'https://a.test',
      })
    ).toContain('fail');
  });

  it('shows reused when reused_unchanged is true', () => {
    expect(
      formatUsageEventDetail('domain_scan_page', {
        domain_scan_id: 'abc',
        page_index: 0,
        ok: true,
        url: 'https://example.com/',
        reused_unchanged: true,
      })
    ).toContain('reused');
  });
});
