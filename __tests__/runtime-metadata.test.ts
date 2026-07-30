import { afterEach, describe, expect, it, vi } from 'vitest';

describe('PLEXON runtime metadata', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('exposes app metadata and the federation contract version', async () => {
    const { getRuntimeMetadata } = await import('@/lib/runtime-metadata');
    expect(getRuntimeMetadata()).toMatchObject({
      app: 'plexon',
      runtime: 'nextjs',
      version: '0.1.0',
      federationContractVersion: '2026-05-plexon-federation-v3',
      passwordResetMail: {
        transport: 'log',
        smtpHostSet: false,
        mailgunApiKeySet: false,
        mailgunDomainSet: false,
        mailgunApiBase: 'https://api.mailgun.net',
        mailgunKeyFormatHint: 'missing',
      },
    });
  });

  it('prefers populated deployment env values and normalizes SOURCE_DATE_EPOCH', async () => {
    vi.stubEnv('SOURCE_COMMIT', 'abc123');
    vi.stubEnv('SOURCE_BRANCH', 'main');
    vi.stubEnv('BUILD_ID', 'deploy-42');
    vi.stubEnv('SOURCE_DATE_EPOCH', '1715529600');

    const { getRuntimeMetadata } = await import('@/lib/runtime-metadata');
    expect(getRuntimeMetadata().deployment).toEqual({
      commitSha: 'abc123',
      branch: 'main',
      buildId: 'deploy-42',
      builtAt: '2024-05-12T16:00:00.000Z',
    });
  });

  it('reports Mailgun env visibility in passwordResetMail (no secrets)', async () => {
    vi.stubEnv('MAILGUN_API_KEY', 'key-test');
    vi.stubEnv('MAILGUN_DOMAIN', 'mg.example.com');
    const { getRuntimeMetadata } = await import('@/lib/runtime-metadata');
    expect(getRuntimeMetadata().passwordResetMail).toEqual({
      transport: 'mailgun',
      smtpHostSet: false,
      mailgunApiKeySet: true,
      mailgunDomainSet: true,
      mailgunApiBase: 'https://api.mailgun.net',
      mailgunKeyFormatHint: 'private-key-prefix-ok',
    });
  });
});
