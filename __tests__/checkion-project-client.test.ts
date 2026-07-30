import { describe, expect, it, vi, afterEach } from 'vitest';
import { createCheckionProject } from '@/lib/integrations/checkion-project-client';

describe('createCheckionProject', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns missing name when empty', async () => {
    const result = await createCheckionProject('  ');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.missing).toContain('name');
  });

  it('creates project via CHECKION API', async () => {
    vi.stubEnv('CHECKION_API_URL', 'https://checkion.example');
    vi.stubEnv('CHECKION_API_TOKEN', 'chk_token');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({ success: true, id: 'proj-1', name: 'Acme', domain: 'acme.com' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await createCheckionProject('Acme', 'acme.com');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.id).toBe('proj-1');
      expect(result.domain).toBe('acme.com');
    }
  });
});
