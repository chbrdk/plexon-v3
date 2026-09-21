/**
 * Transactional mail templates — MSQDX HTML shell + plain text.
 * Spec: specs/api/transactional-email.md · msqdx-ui specs/domain/msqdx-ui-email.md
 *
 * Mimecast (msqdx.com) rejects bodies containing *.plygrnd.tech URLs (554).
 * password_reset / password_changed / account_welcome omit deep links.
 */

import {
  emailButton,
  emailCodePanel,
  emailMetaTable,
  emailParagraph,
  renderMsqdxEmailDocument,
} from '@msqdx/ui'

export type TransactionalMailKind =
  | 'password_reset'
  | 'collection_member_added'
  | 'collection_invite'
  | 'password_changed'
  | 'account_welcome'
  | 'collection_member_removed';

export type PasswordResetPayload = {
  /** Opaque token to paste on /reset-password (no app URL — Mimecast). */
  plainToken: string;
};

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

export type PasswordChangedPayload = { loginUrl?: string };

export type AccountWelcomePayload = {
  loginUrl?: string;
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
  logDetail?: string;
};

const FOOTER = 'PLEXON · MSQ DX';

function plexonDoc(input: {
  title: string;
  eyebrow?: string;
  preheader?: string;
  bodyHtml: string;
}): string {
  return renderMsqdxEmailDocument({
    productLabel: 'PLEXON',
    footerNote: FOOTER,
    ...input,
  });
}

export function renderTransactionalMail<K extends TransactionalMailKind>(
  kind: K,
  payload: TransactionalPayloadByKind[K]
): RenderedMail {
  if (kind === 'password_reset') {
    const p = payload as PasswordResetPayload;
    return {
      subject: 'PLEXON: Code für dein Konto',
      html: plexonDoc({
        eyebrow: 'Sicherheit',
        title: 'Code für dein Konto',
        preheader: 'Dein PLEXON-Code zum Setzen eines neuen Passworts',
        bodyHtml: [
          emailParagraph('Hallo,'),
          emailParagraph('dein PLEXON-Code zum Setzen eines neuen Passworts lautet:'),
          emailCodePanel(p.plainToken, 'Einmal-Code · 1 Stunde gültig'),
          emailParagraph(
            'Öffne in PLEXON die Seite „Passwort zurücksetzen“, füge den Code ein und wähle ein neues Passwort. Wenn du das nicht angefordert hast, ignoriere diese Nachricht.'
          ),
        ].join(''),
      }),
      text: [
        'PLEXON — Code für dein Konto',
        '',
        'Hallo,',
        '',
        'dein PLEXON-Code zum Setzen eines neuen Passworts lautet:',
        '',
        p.plainToken,
        '',
        'Öffne in PLEXON die Seite „Passwort zurücksetzen“, füge den Code ein und wähle ein neues Passwort.',
        'Der Code ist eine Stunde gültig. Wenn du das nicht angefordert hast, ignoriere diese Nachricht.',
        '',
        FOOTER,
      ].join('\n'),
      logDetail: 'password_reset_token_issued',
    };
  }

  if (kind === 'collection_member_added') {
    const p = payload as CollectionMemberAddedPayload;
    const who = p.actorName ? ` von ${p.actorName}` : '';
    return {
      subject: `PLEXON – Zugang zu „${p.collectionName}"`,
      html: plexonDoc({
        eyebrow: 'Team',
        title: 'Zugang freigeschaltet',
        preheader: `Du wurdest zu „${p.collectionName}" hinzugefügt`,
        bodyHtml: [
          emailParagraph(`Du wurdest${who} zur Collection „${p.collectionName}" hinzugefügt.`),
          emailMetaTable([
            { label: 'Collection', value: p.collectionName },
            { label: 'Rolle', value: p.role },
          ]),
          emailButton('Collection öffnen', p.launchUrl),
        ].join(''),
      }),
      text: `Du wurdest${who} zur Collection „${p.collectionName}" hinzugefügt (Rolle: ${p.role}).\n\nÖffnen: ${p.launchUrl}\n\n${FOOTER}`,
      logDetail: p.launchUrl,
    };
  }

  if (kind === 'collection_invite') {
    const p = payload as CollectionInvitePayload;
    const who = p.actorName ? `${p.actorName} hat dich` : 'Du wurdest';
    const meta = [
      { label: 'Collection', value: p.collectionName },
      { label: 'Rolle', value: p.role },
      ...(p.expiresAt ? [{ label: 'Gültig bis', value: p.expiresAt }] : []),
    ];
    return {
      subject: `PLEXON – Einladung zu „${p.collectionName}"`,
      html: plexonDoc({
        eyebrow: 'Team',
        title: 'Einladung zur Collection',
        preheader: `${who} zu „${p.collectionName}" eingeladen`,
        bodyHtml: [
          emailParagraph(
            `${who} zur Collection „${p.collectionName}" eingeladen (Rolle: ${p.role}).`
          ),
          emailMetaTable(meta),
          emailButton('Einladung annehmen', p.inviteUrl),
          emailParagraph(
            'Du musst mit einem PLEXON-Konto derselben Organisation angemeldet sein.'
          ),
        ].join(''),
      }),
      text: `${who} zur Collection „${p.collectionName}" eingeladen (Rolle: ${p.role}).\n\nAnnehmen: ${p.inviteUrl}${p.expiresAt ? `\nGültig bis: ${p.expiresAt}` : ''}\n\n${FOOTER}`,
      logDetail: p.inviteUrl,
    };
  }

  if (kind === 'password_changed') {
    return {
      subject: 'PLEXON: Konto-Hinweis',
      html: plexonDoc({
        eyebrow: 'Sicherheit',
        title: 'Passwort geändert',
        preheader: 'Dein PLEXON-Passwort wurde geändert',
        bodyHtml: [
          emailParagraph('Hallo,'),
          emailParagraph('dein PLEXON-Passwort wurde soeben geändert.'),
          emailParagraph(
            'Wenn du das nicht warst, setze es umgehend über „Passwort vergessen“ in PLEXON zurück und melde dich beim Admin.'
          ),
        ].join(''),
      }),
      text: [
        'PLEXON — Konto-Hinweis',
        '',
        'Hallo,',
        '',
        'dein PLEXON-Passwort wurde soeben geändert.',
        'Wenn du das nicht warst, setze es umgehend über „Passwort vergessen“ in PLEXON zurück und melde dich beim Admin.',
        '',
        FOOTER,
      ].join('\n'),
      logDetail: 'password_changed',
    };
  }

  if (kind === 'account_welcome') {
    return {
      subject: 'PLEXON – Willkommen',
      html: plexonDoc({
        eyebrow: 'Willkommen',
        title: 'Dein PLEXON-Konto',
        preheader: 'Willkommen bei PLEXON',
        bodyHtml: [
          emailParagraph('Willkommen bei PLEXON.'),
          emailParagraph(
            'Melde dich in der PLEXON-App an. Wenn du einen Einladungscode oder Passwort-Code erhalten hast, nutze die entsprechenden Seiten in der App.'
          ),
        ].join(''),
      }),
      text: `Willkommen bei PLEXON.\n\nMelde dich in der PLEXON-App an.\n\n${FOOTER}`,
      logDetail: 'account_welcome',
    };
  }

  const p = payload as CollectionMemberRemovedPayload;
  return {
    subject: `PLEXON – Zugang entfernt („${p.collectionName}")`,
    html: plexonDoc({
      eyebrow: 'Team',
      title: 'Zugang entfernt',
      preheader: `Zugang zu „${p.collectionName}" entfernt`,
      bodyHtml: [
        emailParagraph(`Dein Zugang zur Collection „${p.collectionName}" wurde entfernt.`),
      ].join(''),
    }),
    text: `Dein Zugang zur Collection „${p.collectionName}" wurde entfernt.\n\n${FOOTER}`,
    logDetail: p.collectionName,
  };
}
