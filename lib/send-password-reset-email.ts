/**
 * Password-reset mail — thin facade over shared transactional mailer.
 * Spec: specs/domain/transactional-email.md
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

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  await sendTransactionalEmail({
    kind: 'password_reset',
    to,
    payload: { resetLink },
  });
}

export function getPasswordResetPublicBaseUrl(): string {
  return getPublicAppBaseUrl();
}
