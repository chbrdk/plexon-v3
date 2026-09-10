/**
 * Spec inventory for Collection invite links.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..');

describe('collection invite links specs', () => {
  it('domain + api specs exist and name Access Model B + accept', () => {
    const domain = path.join(root, 'specs/domain/collection-invite-links.md');
    const api = path.join(root, 'specs/api/collection-invites.md');
    expect(existsSync(domain)).toBe(true);
    expect(existsSync(api)).toBe(true);
    const domainText = readFileSync(domain, 'utf8');
    const apiText = readFileSync(api, 'utf8');
    expect(domainText).toContain('Access Model B');
    expect(domainText).toContain('user_platform_project_assignments');
    expect(apiText).toContain('/api/platform/invites/:token/accept');
    expect(apiText).toContain('provisioning/collections');
  });

  it('paths + constants document invite routes', () => {
    const paths = readFileSync(path.join(root, 'knowledge/paths.md'), 'utf8');
    const constants = readFileSync(path.join(root, 'lib/constants.ts'), 'utf8');
    expect(paths).toContain('collection-invite-links');
    expect(paths).toContain('/invite/:token');
    expect(constants).toContain('PATH_COLLECTION_INVITE');
    expect(constants).toContain('apiPlatformProvisioningCollectionInvites');
  });

  it('migration 0015 creates collection_invites', () => {
    const sql = readFileSync(
      path.join(root, 'lib/db/migrations/0015_collection_invites.sql'),
      'utf8'
    );
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS collection_invites');
    expect(sql).toContain('token_hash');
  });
});
