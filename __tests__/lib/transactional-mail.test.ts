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

  it('prefers smtp_http over SMTP_HOST when bridge URL+token are set', async () => {
    vi.stubEnv('SMTP_HOST', 'mail.example.com');
    vi.stubEnv('PLEXON_SMTP_HTTP_URL', 'https://smtp-bridge.example/send');
    vi.stubEnv('PLEXON_SMTP_HTTP_TOKEN', 'bridge-secret');
    const { resolveMailTransport, getTransactionalMailDiagnostics } = await import('@/lib/mail');
    expect(resolveMailTransport()).toBe('smtp_http');
    expect(getTransactionalMailDiagnostics()).toMatchObject({
      transport: 'smtp_http',
      smtpHttpUrlSet: true,
      smtpHostSet: true,
    });
  });

  it('sendTransactionalEmail posts to smtp_http bridge with insecure TLS helper', async () => {
    vi.stubEnv('PLEXON_SMTP_HTTP_URL', 'https://smtp-bridge.example');
    vi.stubEnv('PLEXON_SMTP_HTTP_TOKEN', 'bridge-secret');
    vi.stubEnv('PLEXON_SMTP_FROM', 'PLEXON <noreply@example.com>');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '{"ok":true}',
    });
    vi.stubGlobal('fetch', fetchMock);
    const { sendTransactionalEmail } = await import('@/lib/mail');
    await sendTransactionalEmail({
      kind: 'password_reset',
      to: 'user@example.com',
      payload: { plainToken: 'tok_abc123' },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://smtp-bridge.example/send');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer bridge-secret',
      'Content-Type': 'application/json',
    });
    const body = JSON.parse(String(init.body));
    expect(body.to).toBe('user@example.com');
    expect(body.subject).toContain('PLEXON');
    expect(body.html).toContain('tok_abc123');
    expect(body.text).toContain('tok_abc123');
    expect(body.html).not.toContain('http');
    expect(body.from).toContain('noreply@example.com');
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
      plainToken: 'tok_abc123',
    });
    expect(reset.subject).toContain('PLEXON');
    expect(reset.html).toContain('tok_abc123');
    expect(reset.text).toContain('tok_abc123');
    expect(reset.html).not.toMatch(/https?:\/\//);
    expect(reset.text).not.toMatch(/https?:\/\//);

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

    const changed = renderTransactionalMail('password_changed', {
      loginUrl: 'https://plexon.test/login',
    });
    expect(changed.subject).toContain('Konto-Hinweis');
    expect(changed.text).toContain('Passwort');

    const welcome = renderTransactionalMail('account_welcome', {
      loginUrl: 'https://plexon.test/login',
    });
    expect(welcome.subject).toContain('Willkommen');

    const removed = renderTransactionalMail('collection_member_removed', {
      collectionName: 'Demo',
    });
    expect(removed.html).toContain('entfernt');
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
