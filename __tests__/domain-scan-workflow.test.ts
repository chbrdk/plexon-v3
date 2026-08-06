import { describe, expect, it, vi, beforeEach } from 'vitest'
import { runDomainScanWorkflow } from '@/lib/assistant/workflows/domain-scan'

vi.mock('@/lib/db/assistant-workflow-runs', () => ({
  updateAssistantWorkflowRun: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/assistant/auto-assign-checkion', () => ({
  tryAutoAssignCheckionResource: vi.fn().mockResolvedValue({ assigned: true }),
}))

vi.mock('@/lib/integrations/checkion-domain-scans-v3-client', () => ({
  startCheckionDomainScanV3: vi.fn(),
  pollCheckionDomainScanV3: vi.fn(),
  fetchCheckionDomainScanV3Preview: vi.fn(),
}))

import {
  fetchCheckionDomainScanV3Preview,
  pollCheckionDomainScanV3,
  startCheckionDomainScanV3,
} from '@/lib/integrations/checkion-domain-scans-v3-client'

describe('runDomainScanWorkflow', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requires checkion project id', async () => {
    const result = await runDomainScanWorkflow({ url: 'https://example.com' })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/Projekt/i)
    expect(startCheckionDomainScanV3).not.toHaveBeenCalled()
  })

  it('polls domain scan and returns summary preview', async () => {
    vi.mocked(startCheckionDomainScanV3).mockResolvedValue({
      ok: true,
      scan: {
        id: 'dom-1',
        projectId: 'chk-1',
        url: 'https://example.com',
        status: 'queued',
        overallScore: null,
      },
    })
    vi.mocked(pollCheckionDomainScanV3).mockResolvedValue({
      ok: true,
      scan: {
        id: 'dom-1',
        projectId: 'chk-1',
        url: 'https://example.com',
        status: 'completed',
        overallScore: 88,
        pageCount: 12,
      },
    })
    vi.mocked(fetchCheckionDomainScanV3Preview).mockResolvedValue({
      ok: true,
      preview: {
        id: 'dom-1',
        domain: 'example.com',
        url: 'https://example.com',
        status: 'complete',
        totalPages: 12,
        score: 88,
        stats: { errors: 2, warnings: 5, notices: 1, total: 8 },
        topIssues: [{ title: 'Missing alt', count: 3 }],
      },
    })

    const result = await runDomainScanWorkflow({
      url: 'https://example.com',
      checkionProjectId: 'chk-1',
    })
    expect(result.ok).toBe(true)
    expect(result.scan?.totalPages).toBe(12)
    expect(startCheckionDomainScanV3).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'chk-1', url: 'https://example.com' })
    )
  })
})
