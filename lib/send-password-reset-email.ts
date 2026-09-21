/**
 * Password-reset mail — thin facade over shared transactional mailer.
 * Spec: specs/domain/transactional-email.md
 *
 * Mimecast (msqdx.com) rejects bodies containing *.plygrnd.tech URLs (554).
 * Reset mail therefore carries a pasteable token, not a deep link.
 */
import {
  getMailgunApiKeyFormatHint,
  getPublicAppBaseUrl,
  getTransactionalMailDiagnostics,
  resolveMailTransport,
  sendTransactionalEmail,
  type MailTransport,
  type TransactionalMailDiagnostics,
} from '@/lib/mail';

/** @deprecated Prefer MailTransport / resolveMailTransport */
export type PasswordResetMailTransport = MailTransport;

export { getMailgunApiKeyFormatHint };

export function getPasswordResetMailDiagnostics(): TransactionalMailDiagnostics {
  return getTransactionalMailDiagnostics();
}

export function resolvePasswordResetMailTransport(): MailTransport {
  return resolveMailTransport();
}

export async function sendPasswordResetEmail(to: string, plainToken: string): Promise<void> {
  await sendTransactionalEmail({
    kind: 'password_reset',
    to,
    payload: { plainToken },
  });
}

export function getPasswordResetPublicBaseUrl(): string {
  return getPublicAppBaseUrl();
}
