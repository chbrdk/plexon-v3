import { describe, expect, it, vi, beforeEach } from 'vitest'
import { runGeoAnalysisWorkflow } from '@/lib/assistant/workflows/geo-analysis'

vi.mock('@/lib/db/assistant-workflow-runs', () => ({
  updateAssistantWorkflowRun: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/assistant/auto-assign-checkion', () => ({
  tryAutoAssignCheckionResource: vi.fn().mockResolvedValue({ assigned: true }),
}))

vi.mock('@/lib/integrations/checkion-geo-jobs-v3-client', () => ({
  startCheckionGeoJobV3: vi.fn(),
  pollCheckionGeoJobV3: vi.fn(),
}))

import {
  pollCheckionGeoJobV3,
  startCheckionGeoJobV3,
} from '@/lib/integrations/checkion-geo-jobs-v3-client'

describe('runGeoAnalysisWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fails when url is empty', async () => {
    const result = await runGeoAnalysisWorkflow({ url: '  ', checkionProjectId: 'chk-1' })
    expect(result.ok).toBe(false)
    expect(result.error).toBe('URL fehlt')
  })

  it('requires checkion project id', async () => {
    const result = await runGeoAnalysisWorkflow({ url: 'https://example.com' })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/Projekt/i)
  })

  it('polls geo job and returns preview', async () => {
    vi.mocked(startCheckionGeoJobV3).mockResolvedValue({
      ok: true,
      job: {
        id: 'geo-42',
        projectId: 'chk-1',
        url: 'https://example.com',
        status: 'queued',
        overallScore: null,
        citedShare: null,
        geoFitness: null,
      },
    })
    vi.mocked(pollCheckionGeoJobV3).mockResolvedValue({
      ok: true,
      job: {
        id: 'geo-42',
        projectId: 'chk-1',
        url: 'https://example.com',
        status: 'completed',
        overallScore: 77,
        citedShare: 40,
        geoFitness: 70,
      },
      signals: { citedShare: 40, geoFitness: 70 },
      preview: {
        jobId: 'geo-42',
        url: 'https://example.com',
        status: 'complete',
        overallScore: 77,
      },
    })

    const result = await runGeoAnalysisWorkflow({
      url: 'https://example.com',
      checkionProjectId: 'chk-1',
    })
    expect(result.ok).toBe(true)
    expect(result.jobId).toBe('geo-42')
    expect(result.job?.overallScore).toBe(77)
    expect(pollCheckionGeoJobV3).toHaveBeenCalledWith('geo-42', expect.any(Object))
  })

  it('passes competitors and includePageScan when deep', async () => {
    vi.mocked(startCheckionGeoJobV3).mockResolvedValue({
      ok: true,
      job: {
        id: 'geo-99',
        projectId: 'chk-1',
        url: 'https://a.com',
        status: 'queued',
        overallScore: null,
        citedShare: null,
        geoFitness: null,
      },
    })
    vi.mocked(pollCheckionGeoJobV3).mockResolvedValue({
      ok: true,
      job: {
        id: 'geo-99',
        projectId: 'chk-1',
        url: 'https://a.com',
        status: 'completed',
        overallScore: 62,
        citedShare: 20,
        geoFitness: 50,
      },
      signals: { citedShare: 20, geoFitness: 50 },
      preview: {
        jobId: 'geo-99',
        url: 'https://a.com',
        status: 'complete',
        overallScore: 62,
        competitors: [{ name: 'B', score: 40 }],
      },
    })

    const result = await runGeoAnalysisWorkflow({
      url: 'https://a.com',
      checkionProjectId: 'chk-1',
      deep: true,
      competitors: ['b.com'],
    })
    expect(result.ok).toBe(true)
    expect(result.job?.overallScore).toBe(62)
    expect(startCheckionGeoJobV3).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'chk-1',
        includePageScan: true,
        competitors: ['b.com'],
      })
    )
  })
})
