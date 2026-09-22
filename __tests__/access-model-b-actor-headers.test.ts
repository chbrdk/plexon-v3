import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBrandionFixtureAnalysisRun } from '@/lib/integrations/brandion-analysis-runs-client';
import { buildAudionMachineHeaders } from '@/lib/integrations/audion-connectivity';

describe('Access Model B actor headers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('buildAudionMachineHeaders includes X-Plexon-User-Id', () => {
    vi.stubEnv('AUDION_API_TOKEN', 'audion_' + 'a'.repeat(64));
    vi.stubEnv('AUDION_API_URL', 'https://audion-v3.example/api');
    const headers = buildAudionMachineHeaders('user-1');
    expect(headers).toMatchObject({
      Authorization: expect.stringMatching(/^Bearer audion_/),
      'X-Plexon-User-Id': 'user-1',
    });
  });

  it('brandion analysis run requires actor', async () => {
    vi.stubEnv('BRANDION_API_URL', 'https://brandion.example');
    vi.stubEnv('PLEXON_SERVICE_SECRET', 'secret');
    const result = await createBrandionFixtureAnalysisRun({
      guidelineId: 'g1',
      fixtureId: 'demo',
      plexonUserId: '',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/actor|X-Plexon-User-Id/i);
  });

  it('brandion analysis run sends X-Plexon-User-Id', async () => {
    vi.stubEnv('BRANDION_API_URL', 'https://brandion.example');
    vi.stubEnv('PLEXON_SERVICE_SECRET', 'secret');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          id: 'run-1',
          guidelineId: 'g1',
          status: 'completed',
          passed: 1,
          failed: 0,
          skipped: 0,
        }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const result = await createBrandionFixtureAnalysisRun({
      guidelineId: 'g1',
      fixtureId: 'demo',
      plexonUserId: 'user-brand',
    });
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/guidelines/g1/analysis-runs'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Plexon-User-Id': 'user-brand' }),
      })
    );
  });
});
