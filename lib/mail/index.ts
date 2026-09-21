export {
  deliverMail,
  getMailgunApiKeyFormatHint,
  getPublicAppBaseUrl,
  getTransactionalMailDiagnostics,
  resolveMailTransport,
  type MailTransport,
  type OutboundMailMessage,
  type TransactionalMailDiagnostics,
} from '@/lib/mail/transport';
export { sendTransactionalEmail } from '@/lib/mail/send';
export {
  renderTransactionalMail,
  type AccountWelcomePayload,
  type CollectionInvitePayload,
  type CollectionMemberAddedPayload,
  type CollectionMemberRemovedPayload,
  type PasswordChangedPayload,
  type PasswordResetPayload,
  type TransactionalMailKind,
} from '@/lib/mail/templates';
export { escapeHtml } from '@/lib/mail/escape-html';
