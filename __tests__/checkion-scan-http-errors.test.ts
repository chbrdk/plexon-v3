import { describe, expect, it } from 'vitest';
import { formatCheckionScanHttpFailure } from '@/lib/integrations/checkion-connectivity';

describe('formatCheckionScanHttpFailure', () => {
  it('explains CHECKION 503 rate-limit/redis misconfig', () => {
    const msg = formatCheckionScanHttpFailure(
      503,
      '{"error":"Service temporarily unavailable"}'
    );
    expect(msg).toContain('HTTP 503');
    expect(msg).toContain('REDIS_URL');
  });

  it('explains 429 rate limit', () => {
    expect(formatCheckionScanHttpFailure(429, '{"error":"Too many requests"}')).toContain('429');
  });
});
