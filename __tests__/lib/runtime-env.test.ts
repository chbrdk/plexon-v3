import { afterEach, describe, expect, it, vi } from 'vitest';

describe('runtimeEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('reads process.env by dynamic key', async () => {
    vi.stubEnv('MAILGUN_API_KEY', '  secret  ');
    const { runtimeEnv } = await import('@/lib/runtime-env');
    expect(runtimeEnv('MAILGUN_API_KEY')).toBe('secret');
  });

  it('returns empty string when unset', async () => {
    const { runtimeEnv } = await import('@/lib/runtime-env');
    expect(runtimeEnv('MAILGUN_API_KEY')).toBe('');
  });
});
