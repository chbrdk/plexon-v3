/**
 * sendTransactionalEmail — internal Plexon mailer entry.
 * Spec: specs/api/transactional-email.md
 */

import {
  renderTransactionalMail,
  type TransactionalMailKind,
  type TransactionalPayloadByKind,
} from '@/lib/mail/templates';
import { deliverMail } from '@/lib/mail/transport';

export async function sendTransactionalEmail<K extends TransactionalMailKind>(input: {
  kind: K;
  to: string;
  payload: TransactionalPayloadByKind[K];
}): Promise<void> {
  const to = input.to.trim().toLowerCase();
  if (!to || !to.includes('@')) {
    console.error(`[PLEXON] transactional mail skipped kind=${input.kind}: invalid to`);
    return;
  }
  const rendered = renderTransactionalMail(input.kind, input.payload);
  await deliverMail(input.kind, {
    to,
    subject: rendered.subject,
    html: rendered.html,
    logDetail: rendered.logDetail,
  });
}
