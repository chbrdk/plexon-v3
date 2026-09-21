/**
 * Spec inventory for platform transactional email (SMTP).
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..');

describe('transactional email specs', () => {
  it('domain + api specs exist with must kinds and SMTP ownership', () => {
    const domain = path.join(root, 'specs/domain/transactional-email.md');
    const api = path.join(root, 'specs/api/transactional-email.md');
    expect(existsSync(domain)).toBe(true);
    expect(existsSync(api)).toBe(true);
    const domainText = readFileSync(domain, 'utf8');
    const apiText = readFileSync(api, 'utf8');
    expect(domainText).toContain('password_reset');
    expect(domainText).toContain('collection_member_added');
    expect(domainText).toContain('collection_invite');
    expect(domainText).toContain('Capability apps');
    expect(apiText).toContain('toEmail');
    expect(apiText).toContain('already_member');
    expect(apiText).toContain('sendTransactionalEmail');
  });

  it('members + invites specs document notify / toEmail', () => {
    const members = readFileSync(path.join(root, 'specs/api/collection-members.md'), 'utf8');
    const invites = readFileSync(path.join(root, 'specs/api/collection-invites.md'), 'utf8');
    const inviteDomain = readFileSync(
      path.join(root, 'specs/domain/collection-invite-links.md'),
      'utf8'
    );
    expect(members).toContain('collection_member_added');
    expect(members).toContain('already_member');
    expect(invites).toContain('toEmail');
    expect(invites).toContain('emailedTo');
    expect(inviteDomain).toContain('transactional-email');
  });

  it('knowledge + specs-index + paths document transactional email', () => {
    const knowledge = path.join(root, 'knowledge/transactional-email.md');
    expect(existsSync(knowledge)).toBe(true);
    const knowledgeText = readFileSync(knowledge, 'utf8');
    expect(knowledgeText).toContain('SMTP_HOST');
    expect(knowledgeText).toContain('Plexon sends');
    const index = readFileSync(path.join(root, 'knowledge/specs-index.md'), 'utf8');
    expect(index).toContain('transactional-email.md');
    const paths = readFileSync(path.join(root, 'knowledge/paths.md'), 'utf8');
    expect(paths).toContain('transactional-email');
  });
});
