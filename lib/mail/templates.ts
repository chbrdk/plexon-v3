/**
 * Transactional mail templates (plain HTML).
 * Spec: specs/api/transactional-email.md
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
      subject: 'PLEXON – Passwort zurücksetzen',
      html: `<p>Setze dein Passwort unter:</p><p><a href="${link}">${link}</a></p><p>Der Link ist 1 Stunde gültig.</p>`,
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
      logDetail: p.inviteUrl,
    };
  }
  if (kind === 'password_changed') {
    const p = payload as PasswordChangedPayload;
    const login = escapeHtml(p.loginUrl);
    return {
      subject: 'PLEXON – Passwort geändert',
      html: `<p>Dein PLEXON-Passwort wurde soeben geändert.</p><p>Wenn du das nicht warst, setze es umgehend zurück und melde dich beim Admin.</p><p><a href="${login}">Zur Anmeldung</a></p>`,
      logDetail: p.loginUrl,
    };
  }
  if (kind === 'account_welcome') {
    const p = payload as AccountWelcomePayload;
    const login = escapeHtml(p.loginUrl);
    const setPw = p.setPasswordLink
      ? `<p><a href="${escapeHtml(p.setPasswordLink)}">Passwort setzen</a></p>`
      : '';
    return {
      subject: 'PLEXON – Willkommen',
      html: `<p>Willkommen bei PLEXON.</p>${setPw}<p><a href="${login}">Anmelden</a></p>`,
      logDetail: p.setPasswordLink || p.loginUrl,
    };
  }
  const p = payload as CollectionMemberRemovedPayload;
  const name = escapeHtml(p.collectionName);
  return {
    subject: `PLEXON – Zugang entfernt („${p.collectionName}")`,
    html: `<p>Dein Zugang zur Collection <strong>${name}</strong> wurde entfernt.</p>`,
    logDetail: p.collectionName,
  };
}
