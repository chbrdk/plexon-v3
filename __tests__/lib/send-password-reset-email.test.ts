import { afterEach, describe, expect, it, vi } from 'vitest';

describe('resolvePasswordResetMailTransport', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns smtp when PLEXON_SMTP_HOST is set', async () => {
    vi.stubEnv('PLEXON_SMTP_HOST', 'smtp.internal');
    vi.stubEnv('MAILGUN_API_KEY', 'key-xxx');
    vi.stubEnv('MAILGUN_DOMAIN', 'mg.example.com');
    const { resolvePasswordResetMailTransport } = await import('@/lib/send-password-reset-email');
    expect(resolvePasswordResetMailTransport()).toBe('smtp');
  });

  it('returns smtp when generic SMTP_HOST is set', async () => {
    vi.stubEnv('SMTP_HOST', 'mail.example.com');
    const { resolvePasswordResetMailTransport } = await import('@/lib/send-password-reset-email');
    expect(resolvePasswordResetMailTransport()).toBe('smtp');
  });

  it('returns mailgun when MAILGUN_API_KEY and MAILGUN_DOMAIN are set', async () => {
    vi.stubEnv('MAILGUN_API_KEY', 'key-xxx');
    vi.stubEnv('MAILGUN_DOMAIN', 'mg.example.com');
    const { resolvePasswordResetMailTransport } = await import('@/lib/send-password-reset-email');
    expect(resolvePasswordResetMailTransport()).toBe('mailgun');
  });

  it('returns mailgun when API key is wrapped in double quotes (Coolify paste)', async () => {
    vi.stubEnv('MAILGUN_API_KEY', '"key-abc"');
    vi.stubEnv('MAILGUN_DOMAIN', 'mg.example.com');
    const { resolvePasswordResetMailTransport } = await import('@/lib/send-password-reset-email');
    expect(resolvePasswordResetMailTransport()).toBe('mailgun');
  });

  it('reports wrong key type when public validation key is set', async () => {
    vi.stubEnv('MAILGUN_API_KEY', 'pubkey-abc123');
    vi.stubEnv('MAILGUN_DOMAIN', 'mg.example.com');
    const { getMailgunApiKeyFormatHint } = await import('@/lib/send-password-reset-email');
    expect(getMailgunApiKeyFormatHint()).toBe('wrong-public-validation-key-use-private');
  });

  it('returns log when neither smtp nor mailgun is configured', async () => {
    const { resolvePasswordResetMailTransport } = await import('@/lib/send-password-reset-email');
    expect(resolvePasswordResetMailTransport()).toBe('log');
  });
});

describe('getMailgunMessagesUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('uses US API by default', async () => {
    const { getMailgunMessagesUrl } = await import('@/lib/constants');
    expect(getMailgunMessagesUrl('mg.example.com')).toBe(
      'https://api.mailgun.net/v3/mg.example.com/messages'
    );
  });

  it('uses EU API when MAILGUN_REGION=eu', async () => {
    vi.stubEnv('MAILGUN_REGION', 'eu');
    const { getMailgunMessagesUrl } = await import('@/lib/constants');
    expect(getMailgunMessagesUrl('mg.example.com')).toBe(
      'https://api.eu.mailgun.net/v3/mg.example.com/messages'
    );
  });

  it('uses MAILGUN_API_BASE_URL when set', async () => {
    vi.stubEnv('MAILGUN_API_BASE_URL', 'https://api.eu.mailgun.net/');
    const { getMailgunMessagesUrl } = await import('@/lib/constants');
    expect(getMailgunMessagesUrl('mg.example.com')).toBe(
      'https://api.eu.mailgun.net/v3/mg.example.com/messages'
    );
  });
});
