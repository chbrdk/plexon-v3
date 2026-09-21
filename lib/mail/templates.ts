/**
 * Transactional mail templates (plain HTML + text).
 * Spec: specs/api/transactional-email.md
 *
 * Mimecast (msqdx.com) rejects short “password reset + raw URL” bodies with 554
 * security policy — keep reset/changed copy conversational + multipart text.
 */

import { escapeHtml } from '@/lib/mail/escape-html';

export type TransactionalMailKind =
  | 'password_reset'
  | 'collection_member_added'
  | 'collection_invite'
  | 'password_changed'
  | 'account_welcome'
  | 'collection_member_removed';

export type PasswordResetPayload = { resetLink: string };

export type CollectionMemberAddedPayload = {
  collectionName: string;
  role: string;
  launchUrl: string;
  actorName?: string;
};

export type CollectionInvitePayload = {
  inviteUrl: string;
  collectionName: string;
  role: string;
  expiresAt?: string;
  actorName?: string;
};

export type PasswordChangedPayload = { loginUrl: string };

export type AccountWelcomePayload = {
  loginUrl: string;
  setPasswordLink?: string;
};

export type CollectionMemberRemovedPayload = {
  collectionName: string;
};

export type TransactionalPayloadByKind = {
  password_reset: PasswordResetPayload;
  collection_member_added: CollectionMemberAddedPayload;
  collection_invite: CollectionInvitePayload;
  password_changed: PasswordChangedPayload;
  account_welcome: AccountWelcomePayload;
  collection_member_removed: CollectionMemberRemovedPayload;
};

export type RenderedMail = {
  subject: string;
  html: string;
  text: string;
  /** Log-friendly hint when transport is log (e.g. reset link). */
  logDetail?: string;
};

export function renderTransactionalMail<K extends TransactionalMailKind>(
  kind: K,
  payload: TransactionalPayloadByKind[K]
): RenderedMail {
  if (kind === 'password_reset') {
    const p = payload as PasswordResetPayload;
    const link = escapeHtml(p.resetLink);
    return {
      subject: 'PLEXON: Link für dein Konto',
      html: `<p>Hallo,</p><p>für dein PLEXON-Konto wurde ein Link angefordert, mit dem du dein Passwort neu setzen kannst.</p><p><a href="${link}">Passwort in PLEXON neu setzen</a></p><p>Der Link ist eine Stunde gültig. Wenn du das nicht angefordert hast, kannst du diese Nachricht ignorieren.</p><p>— PLEXON · plygrnd.tech</p>`,
      text: [
        'Hallo,',
        '',
        'für dein PLEXON-Konto wurde ein Link angefordert, mit dem du dein Passwort neu setzen kannst.',
        '',
        `Link: ${p.resetLink}`,
        '',
        'Der Link ist eine Stunde gültig. Wenn du das nicht angefordert hast, ignoriere diese Nachricht.',
        '',
        '— PLEXON · plygrnd.tech',
      ].join('\n'),
      logDetail: p.resetLink,
    };
  }
  if (kind === 'collection_member_added') {
    const p = payload as CollectionMemberAddedPayload;
    const name = escapeHtml(p.collectionName);
    const role = escapeHtml(p.role);
    const launch = escapeHtml(p.launchUrl);
    const who = p.actorName ? escapeHtml(p.actorName) : null;
    return {
      subject: `PLEXON – Zugang zu „${p.collectionName}"`,
      html: `<p>Du wurdest${who ? ` von ${who}` : ''} zur Collection <strong>${name}</strong> hinzugefügt (Rolle: ${role}).</p><p><a href="${launch}">Collection öffnen</a></p>`,
      text: `Du wurdest${p.actorName ? ` von ${p.actorName}` : ''} zur Collection „${p.collectionName}" hinzugefügt (Rolle: ${p.role}).\n\nÖffnen: ${p.launchUrl}`,
      logDetail: p.launchUrl,
    };
  }
  if (kind === 'collection_invite') {
    const p = payload as CollectionInvitePayload;
    const name = escapeHtml(p.collectionName);
    const role = escapeHtml(p.role);
    const invite = escapeHtml(p.inviteUrl);
    const who = p.actorName ? escapeHtml(p.actorName) : null;
    const expires = p.expiresAt ? `<p>Gültig bis: ${escapeHtml(p.expiresAt)}</p>` : '';
    return {
      subject: `PLEXON – Einladung zu „${p.collectionName}"`,
      html: `<p>${who ? `${who} hat dich` : 'Du wurdest'} zur Collection <strong>${name}</strong> eingeladen (Rolle: ${role}).</p><p><a href="${invite}">Einladung annehmen</a></p>${expires}<p>Du musst mit einem PLEXON-Konto derselben Organisation angemeldet sein.</p>`,
      text: `${p.actorName ? `${p.actorName} hat dich` : 'Du wurdest'} zur Collection „${p.collectionName}" eingeladen (Rolle: ${p.role}).\n\nAnnehmen: ${p.inviteUrl}${p.expiresAt ? `\nGültig bis: ${p.expiresAt}` : ''}`,
      logDetail: p.inviteUrl,
    };
  }
  if (kind === 'password_changed') {
    const p = payload as PasswordChangedPayload;
    const login = escapeHtml(p.loginUrl);
    return {
      subject: 'PLEXON: Konto-Hinweis',
      html: `<p>Hallo,</p><p>dein PLEXON-Passwort wurde soeben geändert.</p><p>Wenn du das nicht warst, setze es umgehend zurück und melde dich beim Admin.</p><p><a href="${login}">Zur Anmeldung</a></p><p>— PLEXON · plygrnd.tech</p>`,
      text: [
        'Hallo,',
        '',
        'dein PLEXON-Passwort wurde soeben geändert.',
        'Wenn du das nicht warst, setze es umgehend zurück und melde dich beim Admin.',
        '',
        `Anmeldung: ${p.loginUrl}`,
        '',
        '— PLEXON · plygrnd.tech',
      ].join('\n'),
      logDetail: p.loginUrl,
    };
  }
  if (kind === 'account_welcome') {
    const p = payload as AccountWelcomePayload;
    const login = escapeHtml(p.loginUrl);
    const setPw = p.setPasswordLink
      ? `<p><a href="${escapeHtml(p.setPasswordLink)}">Passwort setzen</a></p>`
      : '';
    const setPwText = p.setPasswordLink ? `\nPasswort setzen: ${p.setPasswordLink}\n` : '';
    return {
      subject: 'PLEXON – Willkommen',
      html: `<p>Willkommen bei PLEXON.</p>${setPw}<p><a href="${login}">Anmelden</a></p>`,
      text: `Willkommen bei PLEXON.${setPwText}\nAnmelden: ${p.loginUrl}`,
      logDetail: p.setPasswordLink || p.loginUrl,
    };
  }
  const p = payload as CollectionMemberRemovedPayload;
  const name = escapeHtml(p.collectionName);
  return {
    subject: `PLEXON – Zugang entfernt („${p.collectionName}")`,
    html: `<p>Dein Zugang zur Collection <strong>${name}</strong> wurde entfernt.</p>`,
    text: `Dein Zugang zur Collection „${p.collectionName}" wurde entfernt.`,
    logDetail: p.collectionName,
  };
}
