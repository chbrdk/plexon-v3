import { describe, expect, it, vi, afterEach } from 'vitest';
import { hydrateDomainScanPageCount } from '@/lib/assistant/event-quick-check/hydrate-domain-scan-page-count';

vi.mock('@/lib/integrations/checkion-domain-scans-v3-client', () => ({
  fetchCheckionDomainScanV3Preview: vi.fn(),
}));

import { fetchCheckionDomainScanV3Preview } from '@/lib/integrations/checkion-domain-scans-v3-client';

describe('hydrateDomainScanPageCount', () => {
  afterEach(() => {
    vi.mocked(fetchCheckionDomainScanV3Preview).mockReset();
  });

  it('keeps scan when totalPages already set', async () => {
    const scan = {
      id: 'domain-1',
      domain: 'example.com',
      url: 'https://example.com',
      status: 'completed',
      score: 80,
      totalPages: 42,
      stats: { errors: 0, warnings: 0, notices: 0, total: 0 },
      topIssues: [],
    };
    await expect(hydrateDomainScanPageCount(scan)).resolves.toEqual(scan);
    expect(fetchCheckionDomainScanV3Preview).not.toHaveBeenCalled();
  });

  it('refetches pageCount from CHECKION when missing', async () => {
    vi.mocked(fetchCheckionDomainScanV3Preview).mockResolvedValue({
      ok: true,
      preview: {
        id: 'domain-1',
        domain: 'example.com',
        url: 'https://example.com',
        status: 'complete',
        score: 79,
        totalPages: 50,
        stats: { errors: 1, warnings: 2, notices: 0, total: 3 },
        topIssues: [{ title: 'Alt', count: 4 }],
      },
    });
    const hydrated = await hydrateDomainScanPageCount({
      id: 'domain-1',
      domain: 'example.com',
      url: 'https://example.com',
      status: 'completed',
      score: 79,
      totalPages: 0,
      stats: { errors: 0, warnings: 0, notices: 0, total: 0 },
      topIssues: [],
    });
    expect(hydrated?.totalPages).toBe(50);
    expect(hydrated?.stats.errors).toBe(1);
  });
});
