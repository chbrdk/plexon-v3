import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  pickBestCorpusScan,
  scanSatisfiesCorpus,
  VAILLANT_MAFO_CORPUS_FRESH_MS,
  VAILLANT_MAFO_CORPUS_MIN_PAGES,
  ensureVaillantCorpusSpine,
} from '@/lib/demo/ensure-vaillant-checkion-corpus';
import type { CheckionDomainScanSummary } from '@/lib/integrations/checkion-domain-scans-v3-client';

vi.mock('@/lib/integrations/checkion-domain-scans-v3-client', () => ({
  checkionDomainScanHostKey: (raw: string) => {
    try {
      const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
      return u.hostname.replace(/^www\./i, '').toLowerCase();
    } catch {
      return raw.toLowerCase();
    }
  },
  listCheckionDomainScansV3: vi.fn(),
  startCheckionDomainScanV3: vi.fn(),
  pollCheckionDomainScanV3: vi.fn(),
}));

import {
  listCheckionDomainScansV3,
  startCheckionDomainScanV3,
  pollCheckionDomainScanV3,
} from '@/lib/integrations/checkion-domain-scans-v3-client';

function scan(partial: Partial<CheckionDomainScanSummary> & { id: string }): CheckionDomainScanSummary {
  return {
    projectId: 'proj-checkion',
    url: 'https://www.vaillant.de/',
    status: 'completed',
    overallScore: 80,
    pageCount: 10,
    completedAt: new Date().toISOString(),
    ...partial,
  };
}

describe('scanSatisfiesCorpus', () => {
  it('accepts fresh completed scan with enough pages', () => {
    const s = scan({
      id: 'd1',
      url: 'https://www.vaillant.de/produkte/waermepumpen/',
      pageCount: 12,
    });
    expect(
      scanSatisfiesCorpus(s, {
        host: 'vaillant.de',
        minPages: VAILLANT_MAFO_CORPUS_MIN_PAGES,
        freshMs: VAILLANT_MAFO_CORPUS_FRESH_MS,
      }),
    ).toBe(true);
  });

  it('rejects stale scan when freshMs is configured', () => {
    const old = new Date(Date.now() - VAILLANT_MAFO_CORPUS_FRESH_MS - 60_000).toISOString();
    const s = scan({ id: 'd-old', completedAt: old, pageCount: 20 });
    expect(
      scanSatisfiesCorpus(s, {
        host: 'vaillant.de',
        minPages: 5,
        freshMs: VAILLANT_MAFO_CORPUS_FRESH_MS,
      }),
    ).toBe(false);
  });

  it('accepts old completed scan when freshMs is null (demo reuse)', () => {
    const old = new Date(Date.now() - VAILLANT_MAFO_CORPUS_FRESH_MS - 60_000).toISOString();
    const s = scan({ id: 'd-old', completedAt: old, pageCount: 20 });
    expect(
      scanSatisfiesCorpus(s, {
        host: 'vaillant.de',
        minPages: 5,
        freshMs: null,
      }),
    ).toBe(true);
  });
});

describe('pickBestCorpusScan', () => {
  it('prefers completed scan with higher page count', () => {
    const best = pickBestCorpusScan(
      [
        scan({ id: 'a', pageCount: 6, status: 'completed' }),
        scan({ id: 'b', pageCount: 40, status: 'completed' }),
        scan({ id: 'c', pageCount: 100, status: 'running' }),
      ],
      'vaillant.de',
    );
    expect(best?.id).toBe('b');
  });
});

describe('ensureVaillantCorpusSpine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts scan once when no completed corpus exists', async () => {
    vi.mocked(listCheckionDomainScansV3).mockResolvedValue({ ok: true, scans: [] });
    vi.mocked(startCheckionDomainScanV3).mockResolvedValue({
      ok: true,
      scan: scan({ id: 'new-scan', status: 'queued', pageCount: 0 }),
    });
    vi.mocked(pollCheckionDomainScanV3).mockResolvedValue({
      ok: true,
      scan: scan({ id: 'new-scan', status: 'completed', pageCount: 30 }),
    });

    const result = await ensureVaillantCorpusSpine({
      checkionProjectId: 'proj-checkion',
      spine: 'b2c',
    });

    expect(result.ok).toBe(true);
    expect(startCheckionDomainScanV3).toHaveBeenCalledTimes(1);
    expect(pollCheckionDomainScanV3).toHaveBeenCalledWith('new-scan', expect.any(Object));
  });

  it('skips start when fresh completed corpus already exists', async () => {
    vi.mocked(listCheckionDomainScansV3).mockResolvedValue({
      ok: true,
      scans: [scan({ id: 'existing', pageCount: 42 })],
    });

    const result = await ensureVaillantCorpusSpine({
      checkionProjectId: 'proj-checkion',
      spine: 'b2c',
    });

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('existing_corpus');
    expect(startCheckionDomainScanV3).not.toHaveBeenCalled();
    expect(pollCheckionDomainScanV3).not.toHaveBeenCalled();
  });

  it('reuses old completed corpus without starting a new scan', async () => {
    const old = new Date(Date.now() - VAILLANT_MAFO_CORPUS_FRESH_MS - 60_000).toISOString();
    vi.mocked(listCheckionDomainScansV3).mockResolvedValue({
      ok: true,
      scans: [scan({ id: 'legacy', pageCount: 55, completedAt: old })],
    });

    const result = await ensureVaillantCorpusSpine({
      checkionProjectId: 'proj-checkion',
      spine: 'b2c',
    });

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.scanId).toBe('legacy');
    expect(startCheckionDomainScanV3).not.toHaveBeenCalled();
  });
});
