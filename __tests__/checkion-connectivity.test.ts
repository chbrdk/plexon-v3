import { afterEach, describe, expect, it } from 'vitest';
import {
  formatCheckionMisconfigHint,
  getCheckionUrlDiagnostics,
  isCheckionUserApiTokenFormat,
  resolveCheckionServiceAuth,
} from '@/lib/integrations/checkion-connectivity';

describe('checkion-connectivity', () => {
  const originalApiUrl = process.env.CHECKION_API_URL;
  const originalApiToken = process.env.CHECKION_API_TOKEN;
  const originalServiceToken = process.env.CHECKION_SERVICE_TOKEN;
  const originalAdminKey = process.env.CHECKION_ADMIN_API_KEY;

  afterEach(() => {
    if (originalApiUrl === undefined) delete process.env.CHECKION_API_URL;
    else process.env.CHECKION_API_URL = originalApiUrl;
    if (originalApiToken === undefined) delete process.env.CHECKION_API_TOKEN;
    else process.env.CHECKION_API_TOKEN = originalApiToken;
    if (originalServiceToken === undefined) delete process.env.CHECKION_SERVICE_TOKEN;
    else process.env.CHECKION_SERVICE_TOKEN = originalServiceToken;
    if (originalAdminKey === undefined) delete process.env.CHECKION_ADMIN_API_KEY;
    else process.env.CHECKION_ADMIN_API_KEY = originalAdminKey;
  });

  it('validates checkion user api token format', () => {
    expect(isCheckionUserApiTokenFormat('checkion_' + 'a'.repeat(64))).toBe(true);
    expect(isCheckionUserApiTokenFormat('short')).toBe(false);
  });

  it('flags missing assistant token even when admin key is set', () => {
    delete process.env.CHECKION_API_TOKEN;
    delete process.env.CHECKION_SERVICE_TOKEN;
    process.env.CHECKION_ADMIN_API_KEY = '1234567890abcdef';
    const diag = getCheckionUrlDiagnostics();
    expect(diag.hasAssistantToken).toBe(false);
    expect(diag.hasAdminApiKey).toBe(true);
    const hint = formatCheckionMisconfigHint(diag);
    expect(hint).toContain('CHECKION_API_TOKEN fehlt');
    expect(hint).toContain('CHECKION_ADMIN_API_KEY');
  });

  it('accepts CHECKION_SERVICE_TOKEN alias', () => {
    delete process.env.CHECKION_API_TOKEN;
    process.env.CHECKION_SERVICE_TOKEN = 'checkion_' + 'b'.repeat(64);
    const diag = getCheckionUrlDiagnostics();
    expect(diag.hasAssistantToken).toBe(true);
    expect(diag.assistantTokenFormatOk).toBe(true);
  });

  it('returns actionable error via resolveCheckionServiceAuth', () => {
    delete process.env.CHECKION_API_TOKEN;
    delete process.env.CHECKION_SERVICE_TOKEN;
    process.env.CHECKION_ADMIN_API_KEY = '1234567890abcdef';
    const auth = resolveCheckionServiceAuth();
    expect(auth.ok).toBe(false);
    if (!auth.ok) {
      expect(auth.error).toContain('CHECKION_API_TOKEN fehlt');
      expect(auth.error).toContain('CHECKION_ADMIN_API_KEY');
    }
  });
});
