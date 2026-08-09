import { describe, it, expect } from 'vitest';
import { parseAdminUsageEventsParams } from '@/lib/admin-usage-events-params';

describe('parseAdminUsageEventsParams', () => {
  it('defaults limit 100 and offset 0', () => {
    const r = parseAdminUsageEventsParams(new URLSearchParams());
    expect(r.ok && r.value).toBeTruthy();
    if (r.ok) {
      expect(r.value.limit).toBe(100);
      expect(r.value.offset).toBe(0);
    }
  });

  it('clamps limit to 1..500', () => {
    const a = parseAdminUsageEventsParams(new URLSearchParams('limit=0'));
    expect(a.ok && a.value.limit).toBe(1);
    const b = parseAdminUsageEventsParams(new URLSearchParams('limit=9999'));
    expect(b.ok && b.value.limit).toBe(500);
    const c = parseAdminUsageEventsParams(new URLSearchParams('limit=50'));
    expect(c.ok && c.value.limit).toBe(50);
  });

  it('accepts optional filters', () => {
    const r = parseAdminUsageEventsParams(
      new URLSearchParams('userId=u1&service=checkion&eventType=domain_scan_page')
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.userId).toBe('u1');
      expect(r.value.service).toBe('checkion');
      expect(r.value.eventType).toBe('domain_scan_page');
    }
  });

  it('rejects invalid service', () => {
    const r = parseAdminUsageEventsParams(new URLSearchParams('service=other'));
    expect(r.ok).toBe(false);
  });

  it('accepts brandion service', () => {
    const r = parseAdminUsageEventsParams(new URLSearchParams('service=brandion'));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.service).toBe('brandion');
  });
});
