import { describe, expect, it } from 'vitest';

import { emailDomainForLog } from '../lib/auth-credentials-log';

describe('emailDomainForLog', () => {
  it('returns domain after @', () => {
    expect(emailDomainForLog('user@example.com')).toBe('example.com');
  });

  it('returns sentinel without @', () => {
    expect(emailDomainForLog('not-an-email')).toBe('invalid-email');
  });
});
