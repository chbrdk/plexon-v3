import { afterEach, describe, expect, it, vi } from 'vitest';

describe('resolveMailTransport / transactional mail', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns smtp when PLEXON_SMTP_HOST is set', async () => {
    vi.stubEnv('PLEXON_SMTP_HOST', 'smtp.internal');
    vi.stubEnv('MAILGUN_API_KEY', 'key-xxx');
    vi.stubEnv('MAILGUN_DOMAIN', 'mg.example.com');
    const { resolveMailTransport } = await import('@/lib/mail');
    expect(resolveMailTransport()).toBe('smtp');
  });

  it('returns smtp when generic SMTP_HOST is set', async () => {
    vi.stubEnv('SMTP_HOST', 'mail.example.com');
    const { resolveMailTransport } = await import('@/lib/mail');
    expect(resolveMailTransport()).toBe('smtp');
  });

  it('returns mailgun when MAILGUN_API_KEY and MAILGUN_DOMAIN are set', async () => {
    vi.stubEnv('MAILGUN_API_KEY', 'key-xxx');
    vi.stubEnv('MAILGUN_DOMAIN', 'mg.example.com');
    const { resolveMailTransport } = await import('@/lib/mail');
    expect(resolveMailTransport()).toBe('mailgun');
  });

  it('returns log when neither smtp nor mailgun is configured', async () => {
    const { resolveMailTransport } = await import('@/lib/mail');
    expect(resolveMailTransport()).toBe('log');
  });

  it('renders password_reset and collection templates', async () => {
    const { renderTransactionalMail } = await import('@/lib/mail');
    const reset = renderTransactionalMail('password_reset', {
      resetLink: 'https://plexon.test/reset-password?token=abc',
    });
    expect(reset.subject).toContain('Passwort');
    expect(reset.html).toContain('https://plexon.test/reset-password?token=abc');

    const added = renderTransactionalMail('collection_member_added', {
      collectionName: 'Acme <Brand>',
      role: 'member',
      launchUrl: 'https://plexon.test/projects/pp-1',
      actorName: 'Ada',
    });
    expect(added.html).toContain('Acme &lt;Brand&gt;');
    expect(added.html).toContain('Ada');

    const invite = renderTransactionalMail('collection_invite', {
      inviteUrl: 'https://plexon.test/invite/inv_x',
      collectionName: 'Demo',
      role: 'admin',
    });
    expect(invite.html).toContain('/invite/inv_x');
  });

  it('sendTransactionalEmail delivers via log transport without throwing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { sendTransactionalEmail } = await import('@/lib/mail');
    await sendTransactionalEmail({
      kind: 'collection_invite',
      to: 'peer@example.com',
      payload: {
        inviteUrl: 'https://plexon.test/invite/inv_1',
        collectionName: 'Demo',
        role: 'member',
      },
    });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
