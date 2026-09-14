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
  buildMetronDashboardHref,
  buildMetronDashboardListBlocks,
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

  it('parses summarize text for deep link', () => {
    const s = parseMetronDashboardSummarizePayload(
      'Dashboard: Recruiting overview\nStatus: published\nTiles: 8\nDeep link: /dashboards/db-1\n- KPI A (gauge): 1',
    )
    expect(s).toEqual({
      id: 'db-1',
      name: 'Recruiting overview',
      teaser: 'KPI A (gauge): 1',
    })
  })
})
