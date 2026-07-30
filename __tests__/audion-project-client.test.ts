import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAudionProject } from '@/lib/integrations/audion-project-client';

describe('createAudionProject', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns missing name when name is empty', async () => {
    const result = await createAudionProject('   ');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toContain('name');
    }
  });

  it('creates project via AUDION API', async () => {
    vi.stubEnv('AUDION_API_URL', 'http://audion-api:8000');
    vi.stubEnv('AUDION_API_TOKEN', 'audion_' + 'a'.repeat(64));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: { get: () => 'application/json' },
      text: async () => JSON.stringify({ id: 'proj-1', name: 'Rheinland Versicherungen' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await createAudionProject('Rheinland Versicherungen');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.id).toBe('proj-1');
      expect(result.name).toBe('Rheinland Versicherungen');
    }

    expect(fetchMock).toHaveBeenCalledWith(
      'http://audion-api:8000/projects',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Rheinland Versicherungen' }),
      })
    );
  });
});
