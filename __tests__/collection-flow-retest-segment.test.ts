/**
 * Enterprise E3 — retest segment + Checkion delta client wiring.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { runRetestSegment } from '@/lib/collection-flow-retest-segment'
import {
  COLLECTION_FLOW_SCHEMA_VERSION,
  createFixRetestTemplate,
  documentHasRetest,
} from '@/lib/collection-test-flow'
import { emptyRunContext, setContextBundle } from '@/lib/collection-flow-run-context'
import { checkionApiScanDelta } from '@/lib/paths/checkion-api'

vi.mock('@/lib/integrations/checkion-scans-client', () => ({
  runCheckionSingleScan: vi.fn(async () => ({
    ok: true as const,
    scan: {
      id: 'scan-new',
      projectId: 'chk-1',
      mode: 'single',
      url: 'https://acme.test/',
      status: 'completed',
      overallScore: 80,
    },
  })),
}))

vi.mock('@/lib/integrations/checkion-scan-delta-client', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/integrations/checkion-scan-delta-client')
  >('@/lib/integrations/checkion-scan-delta-client')
  return {
    ...actual,
    fetchCheckionScanDelta: vi.fn(async () => ({
      ok: true as const,
      delta: {
        kind: 'single' as const,
        currentId: 'scan-new',
        previousId: 'scan-old',
        urlSet: ['https://acme.test'],
        findings: { new: [{ key: 'a::b' }], gone: [], same: [] },
        scores: [{ kind: 'accessibility', current: 80, previous: 70, delta: 10, max: 100 }],
      },
    })),
    fetchCheckionDomainScanDelta: vi.fn(),
    fetchCheckionGeoJobDelta: vi.fn(),
  }
})

vi.mock('@/lib/db/platform-project-bindings', () => ({
  getExternalProjectId: vi.fn(async () => 'chk-1'),
}))

describe('collection-flow-retest-segment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('documentHasRetest detects fix-retest template', () => {
    const doc = createFixRetestTemplate('https://acme.test/')
    expect(documentHasRetest(doc)).toBe(true)
  })

  it('builds checkion delta URLs', () => {
    expect(checkionApiScanDelta('s1')).toMatch(/\/api\/scans\/s1\/delta$/)
    expect(checkionApiScanDelta('s1', 's0')).toContain('previousId=s0')
  })

  it('writes delta catalog after re-run', async () => {
    const doc = createFixRetestTemplate('https://acme.test/')
    let ctx = emptyRunContext()
    ctx = setContextBundle(ctx, 'scan', {
      id: 'scan-old',
      status: 'completed',
      overallScore: 70,
      url: 'https://acme.test/',
    })

    const result = await runRetestSegment({
      platformProjectId: 'pp-1',
      checkionProjectId: 'chk-1',
      doc,
      ctx,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.delta?.previousId).toBe('scan-old')
    expect(result.ctx.outputs.delta?.newCount).toBe(1)
    expect(result.ctx.outputs.scan?.id).toBe('scan-new')
  })

  it('returns no_baseline when quality catalog missing', async () => {
    const doc = {
      schemaVersion: COLLECTION_FLOW_SCHEMA_VERSION,
      templateId: 'enterprise-fix-retest-v1',
      nodes: [{ id: 'n-retest', kind: 'retest' as const, label: 'Gegentest' }],
      edges: [],
      journeyFlow: null,
      lastVerdict: null,
      lastRun: null,
    }
    const result = await runRetestSegment({
      platformProjectId: 'pp-1',
      checkionProjectId: 'chk-1',
      doc,
      ctx: emptyRunContext(),
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toBe('no_baseline')
    expect(result.status).toBe(409)
  })
})
