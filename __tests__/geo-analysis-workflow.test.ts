import { describe, expect, it, vi, beforeEach } from 'vitest';
import { runGeoAnalysisWorkflow } from '@/lib/assistant/workflows/geo-analysis';

vi.mock('@/lib/db/assistant-workflow-runs', () => ({
  updateAssistantWorkflowRun: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/integrations/checkion-geo-client', () => ({
  startCheckionGeoEeat: vi.fn(),
  pollCheckionGeoEeatJob: vi.fn(),
  rerunCheckionGeoCompetitive: vi.fn(),
}));

import {
  pollCheckionGeoEeatJob,
  rerunCheckionGeoCompetitive,
  startCheckionGeoEeat,
} from '@/lib/integrations/checkion-geo-client';

describe('runGeoAnalysisWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fails when url is empty', async () => {
    const result = await runGeoAnalysisWorkflow({ url: '  ' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('URL fehlt');
  });

  it('polls geo job and returns preview', async () => {
    vi.mocked(startCheckionGeoEeat).mockResolvedValue({ ok: true, jobId: 'geo-42' });
    vi.mocked(pollCheckionGeoEeatJob).mockResolvedValue({
      ok: true,
      job: {
        jobId: 'geo-42',
        url: 'https://example.com',
        status: 'complete',
        overallScore: 77,
      },
    });

    const result = await runGeoAnalysisWorkflow({ url: 'https://example.com' });
    expect(result.ok).toBe(true);
    expect(result.jobId).toBe('geo-42');
    expect(result.job?.overallScore).toBe(77);
    expect(pollCheckionGeoEeatJob).toHaveBeenCalledWith('geo-42', expect.any(Object));
  });

  it('runs competitive rerun when deep is true', async () => {
    vi.mocked(startCheckionGeoEeat).mockResolvedValue({ ok: true, jobId: 'geo-99' });
    vi.mocked(pollCheckionGeoEeatJob)
      .mockResolvedValueOnce({
        ok: true,
        job: { jobId: 'geo-99', url: 'https://a.com', status: 'complete', overallScore: 50 },
      })
      .mockResolvedValueOnce({
        ok: true,
        job: {
          jobId: 'geo-99',
          url: 'https://a.com',
          status: 'complete',
          overallScore: 62,
          competitors: [{ name: 'B', score: 40 }],
        },
      });
    vi.mocked(rerunCheckionGeoCompetitive).mockResolvedValue({ ok: true });

    const result = await runGeoAnalysisWorkflow({ url: 'https://a.com', deep: true });
    expect(result.ok).toBe(true);
    expect(result.job?.overallScore).toBe(62);
    expect(rerunCheckionGeoCompetitive).toHaveBeenCalledWith('geo-99');
    expect(pollCheckionGeoEeatJob).toHaveBeenCalledTimes(2);
  });
});
