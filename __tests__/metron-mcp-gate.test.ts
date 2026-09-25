import { describe, expect, it } from 'vitest'
import { resolveUseMetronMcp } from '@/lib/assistant/product-mcp-gate'
import { injectMetronToolArgs } from '@/lib/assistant/metron-tool-args'
import { isConfirmationRequiredToolName } from '@/lib/assistant/orchestrator-complete'
import { buildMetronIntegrationContextBlock } from '@/lib/integrations/metron-connectivity'
import { PLATFORM_ENTITLEMENT_STATUS } from '@/lib/platform-entitlements'

describe('resolveUseMetronMcp', () => {
  it('requires MCP URL', () => {
    expect(
      resolveUseMetronMcp({
        mcpUrl: undefined,
        pageContext: { product: 'metron' },
      }),
    ).toBe(false)
  })

  it('admits metron host product when URL set', () => {
    expect(
      resolveUseMetronMcp({
        mcpUrl: 'https://metron-mcp.example',
        pageContext: { product: 'metron' },
      }),
    ).toBe(true)
  })

  it('admits sibling shell host', () => {
    expect(
      resolveUseMetronMcp({
        mcpUrl: 'https://metron-mcp.example',
        pageContext: { product: 'plexon' },
      }),
    ).toBe(true)
  })

  it('admits active entitlement', () => {
    expect(
      resolveUseMetronMcp({
        mcpUrl: 'https://metron-mcp.example',
        metronEntitlement: { status: PLATFORM_ENTITLEMENT_STATUS.ACTIVE },
      }),
    ).toBe(true)
  })
})

describe('injectMetronToolArgs', () => {
  it('injects actorUserId and skips health', () => {
    expect(
      injectMetronToolArgs('metron_health', {}, { actorUserId: 'u1' }),
    ).toEqual({})
    expect(
      injectMetronToolArgs(
        'metron_dashboards_list',
        {},
        {
          actorUserId: 'u1',
          pageContext: { product: 'metron', pathname: '/dashboards', platformProjectId: 'col-1' },
        },
      ),
    ).toEqual({ actorUserId: 'u1', platformProjectId: 'col-1' })
  })

  it('injects entity id for dashboard/kpi get from page context', () => {
    expect(
      injectMetronToolArgs(
        'metron_dashboard_summarize',
        {},
        {
          actorUserId: 'u1',
          pageContext: {
            product: 'metron',
            pathname: '/dashboards/db-9',
            entityType: 'dashboard',
            entityId: 'db-9',
          },
        },
      ),
    ).toEqual({ actorUserId: 'u1', id: 'db-9' })
    expect(
      injectMetronToolArgs(
        'metron_kpi_evaluate',
        {},
        {
          actorUserId: 'u1',
          pageContext: {
            product: 'metron',
            pathname: '/kpis',
            entityType: 'kpi',
            entityId: 'kpi-3',
          },
        },
      ),
    ).toEqual({ actorUserId: 'u1', id: 'kpi-3' })
  })

  it('injects platformProjectId for kpi_create', () => {
    expect(
      injectMetronToolArgs(
        'metron_kpi_create',
        { name: 'Draft KPI', formulaJson: '{}' },
        {
          actorUserId: 'u1',
          platformProjectId: 'col-9',
        },
      ),
    ).toEqual({
      actorUserId: 'u1',
      platformProjectId: 'col-9',
      name: 'Draft KPI',
      formulaJson: '{}',
    })
  })

  it('injects platformCompanyId for company library list', () => {
    expect(
      injectMetronToolArgs(
        'metron_company_kpi_library_list',
        {},
        {
          actorUserId: 'u1',
          platformCompanyId: 'co-1',
        },
      ),
    ).toEqual({ actorUserId: 'u1', platformCompanyId: 'co-1' })
  })
})

describe('metron write confirm gates', () => {
  it('requires confirm for kpi_create, suite sync, external sync, library bind', () => {
    expect(isConfirmationRequiredToolName('metron_kpi_create')).toBe(true)
    expect(isConfirmationRequiredToolName('metron_suite_connectors_sync')).toBe(true)
    expect(isConfirmationRequiredToolName('metron_external_connection_sync')).toBe(true)
    expect(isConfirmationRequiredToolName('metron_company_kpi_library_bind')).toBe(true)
    expect(isConfirmationRequiredToolName('metron_kpi_evaluate')).toBe(false)
    expect(isConfirmationRequiredToolName('metron_external_connections_list')).toBe(false)
  })
})

describe('buildMetronIntegrationContextBlock', () => {
  it('mentions disabled when URL missing', () => {
    const prev = process.env.METRON_MCP_URL
    delete process.env.METRON_MCP_URL
    try {
      expect(buildMetronIntegrationContextBlock({ useMetronMcp: false })).toMatch(
        /METRON_MCP_URL fehlt/,
      )
    } finally {
      if (prev === undefined) delete process.env.METRON_MCP_URL
      else process.env.METRON_MCP_URL = prev
    }
  })

  it('tool-first guidance when active', () => {
    const prev = process.env.METRON_MCP_URL
    process.env.METRON_MCP_URL = 'https://metron-mcp.example'
    try {
      const block = buildMetronIntegrationContextBlock({ useMetronMcp: true })
      expect(block).toMatch(/Server-SSOT/)
      expect(block).toMatch(/zuerst/)
      expect(block).toMatch(/Suite→Overview/)
      expect(block).toMatch(/kpi_create/)
      expect(block).toMatch(/External/)
      expect(block).toMatch(/Company Library/)
    } finally {
      if (prev === undefined) delete process.env.METRON_MCP_URL
      else process.env.METRON_MCP_URL = prev
    }
  })
})
