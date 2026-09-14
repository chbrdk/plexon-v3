import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  generateMetronShareToken,
  hashReportShareToken,
} from '@/lib/assistant/reports/share-token'
import { parseMetronDashboardShareSnapshot } from '@/lib/assistant/metron-share-snapshot'
import {
  buildMetronDashboardGetBlocks,
  buildMetronShareUiLayout,
  findMetronShareSnapshotInBlocks,
} from '@/lib/assistant/ui-blocks/build-metron-dashboard-ui'

describe('METRON dashboard share', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_METRON_URL = 'https://metron.test'
  })

  it('generates mtn_ tokens and stable hashes', () => {
    const token = generateMetronShareToken()
    expect(token.startsWith('mtn_')).toBe(true)
    expect(hashReportShareToken(token)).toHaveLength(64)
    expect(hashReportShareToken(token)).toBe(hashReportShareToken(token))
  })

  it('parses valid share snapshots', () => {
    const snap = parseMetronDashboardShareSnapshot({
      version: 1,
      dashboardId: 'db-1',
      name: 'Overview',
      metrics: [{ label: 'Hired', value: 12 }],
      chart: { title: 'By seg', labels: ['A'], values: [1] },
      href: 'https://metron.test/dashboards/db-1',
    })
    expect(snap?.dashboardId).toBe('db-1')
    expect(snap?.metrics).toHaveLength(1)
    expect(snap?.chart?.labels).toEqual(['A'])
  })

  it('rejects invalid snapshots', () => {
    expect(parseMetronDashboardShareSnapshot({ version: 2, dashboardId: 'x' })).toBeNull()
    expect(parseMetronDashboardShareSnapshot({ version: 1, dashboardId: '', name: 'x' })).toBeNull()
  })

  it('stamps metronShareSnapshot on get Auto-UI blocks', () => {
    const blocks = buildMetronDashboardGetBlocks(
      {
        id: 'db-1',
        name: 'Overview',
        metrics: [{ label: 'Hired', value: 3 }],
        chart: { title: 'Seg', labels: ['Retail'], values: [2] },
      },
      { source: 'plexon_ui', toolCallId: 't1' },
    )
    const snap = findMetronShareSnapshotInBlocks(blocks)
    expect(snap?.dashboardId).toBe('db-1')
    expect(snap?.href).toContain('/dashboards/db-1')
    expect(blocks.map((b) => b.type)).toEqual(['metric_grid', 'chart', 'link_list'])
  })

  it('rebuilds uiLayout from snapshot for public page', () => {
    const layout = buildMetronShareUiLayout({
      version: 1,
      dashboardId: 'db-1',
      name: 'Overview',
      metrics: [{ label: 'Hired', value: 3 }],
      chart: { title: 'Seg', labels: ['Retail'], values: [2] },
      href: 'https://metron.test/dashboards/db-1',
    })
    expect(layout.blocks.map((b) => b.type)).toEqual(['metric_grid', 'chart', 'link_list'])
  })
})

describe('POST /api/assistant/metron/dashboards/share', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it('returns 401 when unauthenticated', async () => {
    vi.doMock('@/lib/auth-request-user', () => ({
      getRequestUser: vi.fn().mockResolvedValue(null),
    }))
    const { POST } = await import('@/app/api/assistant/metron/dashboards/share/route')
    const res = await POST(
      new Request('http://localhost/api/assistant/metron/dashboards/share', {
        method: 'POST',
        body: JSON.stringify({
          version: 1,
          dashboardId: 'db-1',
          name: 'X',
          metrics: [{ label: 'A', value: 1 }],
          chart: null,
          href: null,
        }),
      }),
    )
    expect(res.status).toBe(401)
  })
})
