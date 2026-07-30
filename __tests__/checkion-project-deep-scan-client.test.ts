import { describe, expect, it, vi, afterEach } from 'vitest';
import { startCheckionProjectDomainScanAll } from '@/lib/integrations/checkion-project-deep-scan-client';

describe('startCheckionProjectDomainScanAll', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('parses own and competitor scan ids from domain-scan-all', async () => {
    vi.stubEnv('CHECKION_API_URL', 'https://checkion.example');
    vi.stubEnv('CHECKION_API_TOKEN', 'chk_token');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            success: true,
            data: {
              own: { scanId: 'scan-own', status: 'started' },
              competitors: {
                'rival.de': { scanId: 'scan-r1', reused: false },
              },
            },
          }),
      })
    );

    const result = await startCheckionProjectDomainScanAll({
      projectId: 'proj-1',
      maxPages: 1000,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.started.ownScanId).toBe('scan-own');
      expect(result.started.competitorScanIds).toEqual({ 'rival.de': 'scan-r1' });
    }
  });
});
