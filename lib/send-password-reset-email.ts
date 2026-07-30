/**
 * Password-reset mail: SMTP first, else Mailgun HTTP API, else server log.
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

/** SMTP host: namespaced or generic (e.g. same vars as another stack in Coolify). */
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

/** Strip wrapping quotes from Coolify / .env paste mistakes. */
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
    trimEnv('MAILGUN_API_KEY') ||
      trimEnv('MG_API_KEY') ||
      trimEnv('MAILGUN_PRIVATE_API_KEY')
  );
}

/** Mailgun HTTP Basic user (almost always `api`). */
function mailgunBasicUser(): string {
  return trimEnv('MAILGUN_BASIC_USERNAME') || 'api';
}

export type PasswordResetMailTransport = 'smtp' | 'mailgun' | 'log';

/** Hint for 401 debugging — never exposes the key itself. */
export function getMailgunApiKeyFormatHint(): string {
  const key = mailgunApiKey();
  if (!key) return 'missing';
  if (key.startsWith('key-')) return 'private-key-prefix-ok';
  if (key.startsWith('pubkey-')) return 'wrong-public-validation-key-use-private';
  if (/^whsec_|^webhook/i.test(key)) return 'wrong-webhook-secret-use-private';
  if (key.length < 20) return 'too-short-check-private-key';
  return 'set-but-unexpected-prefix-use-private-key-from-dashboard';
}

/** For `/api/health`: no secrets, helps verify Coolify runtime env is visible. */
export function getPasswordResetMailDiagnostics(): {
  transport: PasswordResetMailTransport;
  smtpHostSet: boolean;
  mailgunApiKeySet: boolean;
  mailgunDomainSet: boolean;
  mailgunApiBase: string;
  mailgunKeyFormatHint: string;
} {
  const apiKey = mailgunApiKey();
  const domain = mailgunDomain();
  return {
    transport: resolvePasswordResetMailTransport(),
    smtpHostSet: Boolean(smtpHost()),
    mailgunApiKeySet: Boolean(apiKey),
    mailgunDomainSet: Boolean(domain),
    mailgunApiBase: getMailgunApiBaseUrl(),
    mailgunKeyFormatHint: getMailgunApiKeyFormatHint(),
  };
}

export function resolvePasswordResetMailTransport(): PasswordResetMailTransport {
  if (smtpHost()) return 'smtp';
  if (mailgunApiKey() && mailgunDomain()) return 'mailgun';
  return 'log';
}

function resetEmailHtml(resetLink: string): string {
  return `<p>Setze dein Passwort unter:</p><p><a href="${resetLink}">${resetLink}</a></p><p>Der Link ist 1 Stunde gültig.</p>`;
}

function resetEmailSubject(): string {
  return 'PLEXON – Passwort zurücksetzen';
}

function fromAddress(transport: PasswordResetMailTransport): string {
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

async function sendViaSmtp(to: string, resetLink: string): Promise<void> {
  const host = smtpHost();
  const transporter = nodemailer.createTransport({
    host,
    port: smtpPort(),
    secure: smtpSecure(),
    auth: (() => {
      const user = smtpUser();
      const pass = smtpPassword();
      if (!user) return undefined;
      return { user, pass };
    })(),
  });
  await transporter.sendMail({
    from: fromAddress('smtp'),
    to,
    subject: resetEmailSubject(),
    html: resetEmailHtml(resetLink),
  });
}

/** Parse Mailgun JSON error `{ "message": "..." }` or return raw body. */
function mailgunErrorText(body: string): string {
  try {
    const j = JSON.parse(body) as { message?: string };
    if (typeof j.message === 'string' && j.message.trim()) return j.message.trim();
  } catch {
    /* ignore */
  }
  return body.trim() || '(empty body)';
}

/** Mailgun: Basic auth user `api`, password = private API key. Body: x-www-form-urlencoded. */
async function sendViaMailgun(to: string, resetLink: string): Promise<void> {
  const apiKey = mailgunApiKey();
  const domain = mailgunDomain();
  if (!apiKey || !domain) return;

  const url = getMailgunMessagesUrl(domain);
  const user = mailgunBasicUser();
  const auth = Buffer.from(`${user}:${apiKey}`, 'utf8').toString('base64');
  const from = fromAddress('mailgun');
  const body = new URLSearchParams({
    from,
    to,
    subject: resetEmailSubject(),
    html: resetEmailHtml(resetLink),
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

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  const mode = resolvePasswordResetMailTransport();
  try {
    if (mode === 'smtp') {
      await sendViaSmtp(to, resetLink);
      return;
    }
    if (mode === 'mailgun') {
      await sendViaMailgun(to, resetLink);
      return;
    }
  } catch (e) {
    console.error('[PLEXON] Password reset email failed:', e);
    return;
  }
  console.warn(
    '[PLEXON] No SMTP (PLEXON_SMTP_HOST / SMTP_HOST) and no Mailgun (MAILGUN_API_KEY + MAILGUN_DOMAIN); reset link for',
    to,
    ':',
    resetLink
  );
}

export function getPasswordResetPublicBaseUrl(): string {
  return (runtimeEnv('NEXTAUTH_URL') || runtimeEnv('PUBLIC_APP_URL')).replace(/\/$/, '');
}
