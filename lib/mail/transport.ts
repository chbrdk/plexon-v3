/**
 * Transactional mail transport: SMTP-HTTP bridge → SMTP → Mailgun → log.
 * Spec: specs/domain/transactional-email.md
 */

import nodemailer from 'nodemailer';

import {
  getMailgunApiBaseUrl,
  getMailgunMessagesUrl,
  URL_MAILGUN_API_AUTH,
  URL_MAILGUN_APP,
  URL_MAILGUN_DOCS_SENDING,
} from '@/lib/constants';
import { runtimeEnv } from '@/lib/runtime-env';

function trimEnv(key: string): string {
  return runtimeEnv(key);
}

/** HTTPS→SMTP bridge on the Coolify mail host (bypasses blocked TCP 587 from projects-01). */
function smtpHttpUrl(): string {
  return (
    trimEnv('PLEXON_SMTP_HTTP_URL') ||
    trimEnv('SMTP_HTTP_URL') ||
    trimEnv('PLEXON_SMTP_HTTP_BRIDGE_URL')
  ).replace(/\/$/, '');
}

function smtpHttpToken(): string {
  return trimEnv('PLEXON_SMTP_HTTP_TOKEN') || trimEnv('SMTP_HTTP_TOKEN') || trimEnv('SMTP_BRIDGE_TOKEN');
}

function smtpHost(): string {
  return trimEnv('PLEXON_SMTP_HOST') || trimEnv('SMTP_HOST');
}

function smtpPort(): number {
  const raw = trimEnv('PLEXON_SMTP_PORT') || trimEnv('SMTP_PORT') || '587';
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 587;
}

function smtpUser(): string {
  return trimEnv('PLEXON_SMTP_USER') || trimEnv('SMTP_USER');
}

function smtpPassword(): string {
  return trimEnv('PLEXON_SMTP_PASSWORD') || trimEnv('SMTP_PASSWORD') || trimEnv('SMTP_PASS');
}

function smtpSecure(): boolean {
  const v = (trimEnv('PLEXON_SMTP_SECURE') || trimEnv('SMTP_SECURE')).toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes') return true;
  return smtpPort() === 465;
}

function mailgunDomain(): string {
  return trimEnv('MAILGUN_DOMAIN') || trimEnv('MAILGUN_SENDING_DOMAIN') || trimEnv('MG_DOMAIN');
}

function normalizeMailgunSecret(raw: string): string {
  let s = raw.trim();
  if (s.length >= 2) {
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      s = s.slice(1, -1).trim();
    }
  }
  return s;
}

function mailgunApiKey(): string {
  return normalizeMailgunSecret(
    trimEnv('MAILGUN_API_KEY') || trimEnv('MG_API_KEY') || trimEnv('MAILGUN_PRIVATE_API_KEY')
  );
}

function mailgunBasicUser(): string {
  return trimEnv('MAILGUN_BASIC_USERNAME') || 'api';
}

export type MailTransport = 'smtp_http' | 'smtp' | 'mailgun' | 'log';

export function getMailgunApiKeyFormatHint(): string {
  const key = mailgunApiKey();
  if (!key) return 'missing';
  if (key.startsWith('key-')) return 'private-key-prefix-ok';
  if (key.startsWith('pubkey-')) return 'wrong-public-validation-key-use-private';
  if (/^whsec_|^webhook/i.test(key)) return 'wrong-webhook-secret-use-private';
  if (key.length < 20) return 'too-short-check-private-key';
  return 'set-but-unexpected-prefix-use-private-key-from-dashboard';
}

export type TransactionalMailDiagnostics = {
  transport: MailTransport;
  smtpHttpUrlSet: boolean;
  smtpHostSet: boolean;
  mailgunApiKeySet: boolean;
  mailgunDomainSet: boolean;
  mailgunApiBase: string;
  mailgunKeyFormatHint: string;
};

export function getTransactionalMailDiagnostics(): TransactionalMailDiagnostics {
  const apiKey = mailgunApiKey();
  const domain = mailgunDomain();
  return {
    transport: resolveMailTransport(),
    smtpHttpUrlSet: Boolean(smtpHttpUrl() && smtpHttpToken()),
    smtpHostSet: Boolean(smtpHost()),
    mailgunApiKeySet: Boolean(apiKey),
    mailgunDomainSet: Boolean(domain),
    mailgunApiBase: getMailgunApiBaseUrl(),
    mailgunKeyFormatHint: getMailgunApiKeyFormatHint(),
  };
}

export function resolveMailTransport(): MailTransport {
  // Prefer HTTPS bridge when configured — projects-01 cannot reach mail host TCP 587.
  if (smtpHttpUrl() && smtpHttpToken()) return 'smtp_http';
  if (smtpHost()) return 'smtp';
  if (mailgunApiKey() && mailgunDomain()) return 'mailgun';
  return 'log';
}

function fromAddress(transport: MailTransport): string {
  const explicit =
    trimEnv('PLEXON_PASSWORD_RESET_FROM_EMAIL') || trimEnv('PLEXON_SMTP_FROM') || trimEnv('SMTP_FROM');
  if (explicit) return explicit;
  if (transport === 'mailgun') {
    const d = mailgunDomain();
    if (d) return `PLEXON <postmaster@${d}>`;
  }
  const u = smtpUser();
  if (u.includes('@')) return `PLEXON <${u}>`;
  return 'PLEXON <noreply@localhost>';
}

function mailgunErrorText(body: string): string {
  try {
    const j = JSON.parse(body) as { message?: string };
    if (typeof j.message === 'string' && j.message.trim()) return j.message.trim();
  } catch {
    /* ignore */
  }
  return body.trim() || '(empty body)';
}

export type OutboundMailMessage = {
  to: string;
  subject: string;
  html: string;
  /** Log-friendly hint when transport is log (e.g. reset link). */
  logDetail?: string;
};

function smtpHttpSendUrl(): string {
  const base = smtpHttpUrl();
  if (!base) return '';
  if (base.endsWith('/send')) return base;
  return `${base}/send`;
}

async function sendViaSmtpHttp(message: OutboundMailMessage): Promise<void> {
  const url = smtpHttpSendUrl();
  const token = smtpHttpToken();
  if (!url || !token) return;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: message.to,
      subject: message.subject,
      html: message.html,
      from: fromAddress('smtp_http'),
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`smtp_http ${res.status} url=${url} body=${txt.slice(0, 200)}`);
  }
}

async function sendViaSmtp(message: OutboundMailMessage): Promise<void> {
  const host = smtpHost();
  const port = smtpPort();
  const secure = smtpSecure();
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    auth: (() => {
      const user = smtpUser();
      const pass = smtpPassword();
      if (!user) return undefined;
      return { user, pass };
    })(),
  });
  try {
    await transporter.sendMail({
      from: fromAddress('smtp'),
      to: message.to,
      subject: message.subject,
      html: message.html,
    });
  } catch (e) {
    const hint = `host=${host} port=${port} secure=${secure}`;
    if (e instanceof Error) {
      e.message = `${e.message} (${hint})`;
    }
    throw e;
  }
}

async function sendViaMailgun(message: OutboundMailMessage): Promise<void> {
  const apiKey = mailgunApiKey();
  const domain = mailgunDomain();
  if (!apiKey || !domain) return;

  const url = getMailgunMessagesUrl(domain);
  const user = mailgunBasicUser();
  const auth = Buffer.from(`${user}:${apiKey}`, 'utf8').toString('base64');
  const from = fromAddress('mailgun');
  const body = new URLSearchParams({
    from,
    to: message.to,
    subject: message.subject,
    html: message.html,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    console.error('[PLEXON] Mailgun email failed:', res.status, txt);
    const human = mailgunErrorText(txt);
    const lower = human.toLowerCase();

    if (res.status === 401) {
      console.error(
        `[PLEXON] Mailgun 401 Forbidden: almost always (1) wrong private API key — use the key from Mailgun (Account → API keys), not a public validation key or webhook signing secret; (2) EU vs US — EU accounts must use MAILGUN_REGION=eu or MAILGUN_EU=1, or set MAILGUN_API_BASE_URL=https://api.eu.mailgun.net; (3) IP allowlist in Mailgun blocking your server. See ${URL_MAILGUN_API_AUTH}`
      );
    } else if (res.status === 403 && lower.includes('activate your mailgun')) {
      console.error(
        `[PLEXON] Mailgun 403: The Mailgun account is not activated yet. Check the activation email from Mailgun or log in at ${URL_MAILGUN_APP} and resend activation. Until the account is active, sending is blocked (this is not a wrong MAILGUN_DOMAIN or FROM address).`
      );
    } else if (res.status === 403) {
      console.error(
        `[PLEXON] Mailgun 403: ${human} — often unverified DNS for the sending domain, sandbox recipient limits, or MAILGUN_DOMAIN does not match the domain you added in Mailgun. Sending overview: ${URL_MAILGUN_DOCS_SENDING}`
      );
    } else {
      console.error(
        `[PLEXON] Mailgun ${res.status}: ${human}. Sending overview: ${URL_MAILGUN_DOCS_SENDING}`
      );
    }
  }
}

/** Best-effort outbound send. Never throws. */
export async function deliverMail(
  kind: string,
  message: OutboundMailMessage
): Promise<{ transport: MailTransport }> {
  const mode = resolveMailTransport();
  try {
    if (mode === 'smtp_http') {
      await sendViaSmtpHttp(message);
      return { transport: 'smtp_http' };
    }
    if (mode === 'smtp') {
      await sendViaSmtp(message);
      return { transport: 'smtp' };
    }
    if (mode === 'mailgun') {
      await sendViaMailgun(message);
      return { transport: 'mailgun' };
    }
  } catch (e) {
    console.error(`[PLEXON] transactional mail failed kind=${kind}:`, e);
    return { transport: mode };
  }

  console.warn(
    `[PLEXON] No SMTP-HTTP (PLEXON_SMTP_HTTP_URL + TOKEN), SMTP (PLEXON_SMTP_HOST / SMTP_HOST), or Mailgun; kind=${kind} to=${message.to}`,
    message.logDetail ?? message.subject
  );
  return { transport: 'log' };
}

export function getPublicAppBaseUrl(): string {
  return (runtimeEnv('NEXTAUTH_URL') || runtimeEnv('PUBLIC_APP_URL')).replace(/\/$/, '');
}
