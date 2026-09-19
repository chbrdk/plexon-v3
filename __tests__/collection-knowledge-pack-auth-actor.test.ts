import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-request-user', () => ({
  getRequestUser: vi.fn(async () => null),
  isAdmin: vi.fn(() => false),
}));

vi.mock('@/lib/platform-project-access', () => ({
  userCanViewPlatformProject: vi.fn(async (_id: string, _role: string, pp: string) =>
    pp === 'pp-allowed'
  ),
}));

import { authorizeKnowledgeRead } from '@/lib/collection-knowledge-pack-auth';
import { PLEXON_CONTRACT_VERSION_HEADER, PLEXON_FEDERATION_CONTRACT_VERSION, PLEXON_SERVICE_SECRET_HEADER } from '@/lib/platform-contract';

describe('authorizeKnowledgeRead actor gate', () => {
  const secret = 'svc-secret-test';

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('service secret without actor fails closed', async () => {
    vi.stubEnv('PLEXON_SERVICE_SECRET', secret);
    const req = new Request('http://localhost/api/knowledge', {
      headers: {
        [PLEXON_SERVICE_SECRET_HEADER]: secret,
        [PLEXON_CONTRACT_VERSION_HEADER]: PLEXON_FEDERATION_CONTRACT_VERSION,
      },
    });
    const auth = await authorizeKnowledgeRead(req, 'pp-allowed');
    expect(auth).toEqual({ error: 'unauthorized' });
  });

  it('service secret + actor enforces Access Model B', async () => {
    vi.stubEnv('PLEXON_SERVICE_SECRET', secret);
    const denied = await authorizeKnowledgeRead(
      new Request('http://localhost/api/knowledge', {
        headers: {
          [PLEXON_SERVICE_SECRET_HEADER]: secret,
          [PLEXON_CONTRACT_VERSION_HEADER]: PLEXON_FEDERATION_CONTRACT_VERSION,
          'X-Plexon-User-Id': 'user-a',
        },
      }),
      'pp-denied'
    );
    expect(denied).toEqual({ error: 'forbidden' });

    const allowed = await authorizeKnowledgeRead(
      new Request('http://localhost/api/knowledge', {
        headers: {
          [PLEXON_SERVICE_SECRET_HEADER]: secret,
          [PLEXON_CONTRACT_VERSION_HEADER]: PLEXON_FEDERATION_CONTRACT_VERSION,
          'X-Plexon-User-Id': 'user-a',
        },
      }),
      'pp-allowed'
    );
    expect(allowed).toEqual({ kind: 'service', userId: 'user-a' });
  });
});
