import { describe, expect, it, vi } from 'vitest';
import { fetchDnsCheck } from '@/lib/integrations/external/dns-doh-client';
import { fetchMozillaObservatorySecurity } from '@/lib/integrations/external/mozilla-observatory-client';

describe('external API clients', () => {
  it('parses DNS DoH JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          Answer: [{ type: 1, data: '93.184.216.34' }],
        }),
      })
    );

    const result = await fetchDnsCheck('example.com');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.host).toBe('example.com');
      expect(result.data.records.some((r) => r.type === 'A')).toBe(true);
    }
    vi.unstubAllGlobals();
  });

  it('returns error when Observatory start fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'unavailable',
      })
    );

    const result = await fetchMozillaObservatorySecurity('example.com');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('503');
    }
    vi.unstubAllGlobals();
  });
});
