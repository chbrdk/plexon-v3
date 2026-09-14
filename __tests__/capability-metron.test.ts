/**
 * METRON Wave 9 Capability Catalog + dashboard UI helpers.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getCapability,
  listCapabilities,
  validateCapabilityCatalog,
  executeMetronReadCapability,
} from '@/lib/capabilities'
import {
  buildMetronDashboardGetBlocks,
  buildMetronDashboardHref,
  buildMetronDashboardListBlocks,
  buildMetronDashboardSummarizeBlocks,
  parseMetronDashboardGetPayload,
  parseMetronDashboardSummarizePayload,
  parseMetronDashboardsListPayload,
} from '@/lib/assistant/ui-blocks/build-metron-dashboard-ui'
import { capabilityIdFromAgentTool } from '@/lib/capabilities/adapters/agent'

describe('METRON Wave 9 capability catalog', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('lists metron agent-only capability ids', () => {
    expect(validateCapabilityCatalog()).toEqual([])
    const ids = listCapabilities().map((c) => c.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'metron.health',
        'metron.projects.list',
        'metron.datasets.list',
        'metron.kpis.list',
        'metron.dashboards.list',
        'metron.dashboard.get',
        'metron.dashboard.summarize',
        'metron.dashboard.create',
        'metron.kpi.starter_pack_install',
        'metron.suite_connectors.sync',
      ]),
    )
    expect(getCapability('metron.dashboards.list')?.owner).toBe('metron')
    expect(getCapability('metron.dashboards.list')?.surfaces).toEqual({
      agent: true,
      flow: false,
    })
    expect(getCapability('metron.dashboard.create')?.confirmation).toBe('human_gate')
  })

  it('maps MCP tool names to metron capabilities', () => {
    expect(capabilityIdFromAgentTool('metron_dashboards_list')).toBe('metron.dashboards.list')
    expect(capabilityIdFromAgentTool('metron_dashboard_create')).toBe('metron.dashboard.create')
  })

  it('read executor returns ok with mocked fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ items: [{ id: 'p1', name: 'Demo' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    process.env.NEXT_PUBLIC_METRON_URL = 'https://metron.test'
    process.env.PLEXON_SERVICE_SECRET = 'test-secret'

    const result = await executeMetronReadCapability(
      { op: 'projects_list' },
      { source: 'agent', actorUserId: 'user-1' },
    )
    expect(result.ok).toBe(true)
    expect(result.catalogRoot).toBe('metron.projects')
    expect(fetch).toHaveBeenCalled()
  })
})

describe('METRON dashboard generative UI', () => {
  it('parses list payload and builds link_list', () => {
    process.env.NEXT_PUBLIC_METRON_URL = 'https://metron.test'
    const items = parseMetronDashboardsListPayload(
      JSON.stringify({
        items: [{ id: 'db-1', name: 'Recruiting overview', widgetCount: 8, status: 'published' }],
      }),
    )
    expect(items).toHaveLength(1)
    expect(buildMetronDashboardHref('db-1')).toBe('https://metron.test/dashboards/db-1')
    const blocks = buildMetronDashboardListBlocks(items!, {
      source: 'plexon_ui',
      toolCallId: 't1',
    })
    expect(blocks[0]?.type).toBe('link_list')
  })

  it('parses summarize text into metrics + link_list', () => {
    process.env.NEXT_PUBLIC_METRON_URL = 'https://metron.test'
    const s = parseMetronDashboardSummarizePayload(
      'Dashboard: Recruiting overview\nStatus: published\nTiles: 8\nDeep link: /dashboards/db-1\n- Hired (kpi_tile): 12\n- Fill rate (gauge): 0.4\n- By status (chart): —',
    )
    expect(s?.id).toBe('db-1')
    expect(s?.name).toBe('Recruiting overview')
    expect(s?.metrics).toEqual([
      { label: 'Hired', value: 12 },
      { label: 'Fill rate', value: 0.4 },
    ])
    const blocks = buildMetronDashboardSummarizeBlocks(s!, {
      source: 'plexon_ui',
      toolCallId: 't2',
    })
    expect(blocks.map((b) => b.type)).toEqual(['metric_grid', 'link_list'])
  })

  it('builds metric_grid + chart + link from dashboard_get JSON', () => {
    process.env.NEXT_PUBLIC_METRON_URL = 'https://metron.test'
    const payload = parseMetronDashboardGetPayload(
      JSON.stringify({
        dashboard: {
          id: 'db-1',
          name: 'Recruiting overview',
          widgets: [
            { id: 'w1', title: 'Hired', kind: 'kpi_tile' },
            { id: 'w2', title: 'Fill', kind: 'gauge' },
            {
              id: 'w3',
              title: 'By segment',
              kind: 'chart',
              chartPoints: [
                { label: 'Retail', value: 3 },
                { label: 'Corporate', value: 5 },
              ],
            },
          ],
        },
        evaluations: {
          w1: { value: 12, status: 'ok' },
          w2: { value: 0.4, status: 'ok' },
          w3: { value: null, status: 'ok' },
        },
      }),
    )
    expect(payload?.metrics).toEqual([
      { label: 'Hired', value: 12 },
      { label: 'Fill', value: 0.4 },
    ])
    expect(payload?.chart?.labels).toEqual(['Retail', 'Corporate'])
    const blocks = buildMetronDashboardGetBlocks(payload!, {
      source: 'plexon_ui',
      toolCallId: 't3',
    })
    expect(blocks.map((b) => b.type)).toEqual(['metric_grid', 'chart', 'link_list'])
  })

  it('returns empty blocks for bad get payload', () => {
    expect(parseMetronDashboardGetPayload('{')).toBeNull()
    expect(parseMetronDashboardGetPayload(JSON.stringify({ error: 'nope' }))).toBeNull()
  })
})
