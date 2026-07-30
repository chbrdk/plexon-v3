import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  normalizeCheckionCompetitorDomains,
  suggestCheckionProjectCompetitors,
  updateCheckionProject,
} from '@/lib/integrations/checkion-project-competitors-client';

describe('normalizeCheckionCompetitorDomains', () => {
  it('dedupes and strips www', () => {
    expect(
      normalizeCheckionCompetitorDomains([
        'https://www.Rival.de/path',
        'rival.de',
        'RIVAL.DE',
      ])
    ).toEqual(['rival.de']);
  });
});

describe('checkion project competitors client', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('suggests competitors via project API', async () => {
    vi.stubEnv('CHECKION_API_URL', 'https://checkion.example');
    vi.stubEnv('CHECKION_API_TOKEN', 'chk_token');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            competitors: ['alpha.de', 'https://www.beta.com'],
            queries: ['Frage 1'],
          }),
      })
    );

    const result = await suggestCheckionProjectCompetitors({
      projectId: 'proj-1',
      url: 'https://acme.com',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.competitors).toEqual(['alpha.de', 'beta.com']);
      expect(result.queries).toEqual(['Frage 1']);
    }
  });

  it('patches project competitors', async () => {
    vi.stubEnv('CHECKION_API_URL', 'https://checkion.example');
    vi.stubEnv('CHECKION_API_TOKEN', 'chk_token');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          success: true,
          data: { competitors: ['alpha.de', 'beta.com'] },
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await updateCheckionProject({
      projectId: 'proj-1',
      competitors: ['alpha.de', 'beta.com'],
    });
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://checkion.example/api/projects/proj-1',
      expect.objectContaining({ method: 'PATCH' })
    );
  });
});
