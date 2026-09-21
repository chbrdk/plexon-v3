import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveCheckionServiceAuth } from '@/lib/integrations/checkion-connectivity';

describe('resolveCheckionServiceAuth (Access Model B)', () => {
  afterEach(() => {
    delete process.env.CHECKION_API_TOKEN;
    delete process.env.CHECKION_SERVICE_TOKEN;
    delete process.env.PLEXON_SERVICE_SECRET;
    delete process.env.PLEXON_FEDERATION_CONTRACT_VERSION;
  });

  it('omits X-Service-Secret when actor is missing so personal Bearer can authenticate', () => {
    process.env.CHECKION_API_TOKEN = `checkion_${'a'.repeat(64)}`;
    process.env.PLEXON_SERVICE_SECRET = 'shared-secret';

    const auth = resolveCheckionServiceAuth();
    expect(auth.ok).toBe(true);
    if (!auth.ok) return;
    expect(auth.headers.Authorization).toMatch(/^Bearer checkion_/);
    expect(auth.headers['X-Service-Secret']).toBeUndefined();
    expect(auth.headers['X-Plexon-User-Id']).toBeUndefined();
  });

  it('attaches service secret + contract + actor when actor is present', () => {
    process.env.CHECKION_API_TOKEN = `checkion_${'b'.repeat(64)}`;
    process.env.PLEXON_SERVICE_SECRET = 'shared-secret';
    process.env.PLEXON_FEDERATION_CONTRACT_VERSION = '2026-05-plexon-federation-v3';

    const auth = resolveCheckionServiceAuth('user-42');
    expect(auth.ok).toBe(true);
    if (!auth.ok) return;
    expect(auth.headers['X-Plexon-User-Id']).toBe('user-42');
    expect(auth.headers['X-Service-Secret']).toBe('shared-secret');
    expect(auth.headers['X-Plexon-Contract-Version']).toBe('2026-05-plexon-federation-v3');
  });
});
