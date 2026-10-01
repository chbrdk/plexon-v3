import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, afterEach } from 'vitest'
import {
  hubExposedToolName,
  inferMcpToolSideEffect,
  isValidMcpServerSlug,
  normalizeMcpServerSlug,
  redactMcpServerAuthConfig,
  resolveMcpHubAuthHeaders,
} from '@/lib/mcp-hub/naming'
import { toolAllowedByPlan } from '@/lib/assistant/assistant-planner'
import {
  __setHubToolAllowlistForTests,
  clearHubToolRuntimeState,
  isHubAllowlistedTool,
} from '@/lib/mcp-hub/runtime'
import {
  API_ADMIN_MCP_SERVERS,
  PATH_ADMIN_MCP_HUB,
  apiAdminMcpServer,
  apiAdminMcpServerDiscover,
} from '@/lib/constants'

describe('mcp-hub naming', () => {
  it('normalizes and validates slugs', () => {
    expect(normalizeMcpServerSlug(' Canva Hub ')).toBe('canva-hub')
    expect(isValidMcpServerSlug('canva')).toBe(true)
    expect(isValidMcpServerSlug('A')).toBe(false)
  })

  it('prefixes exposed tool names with slug', () => {
    expect(hubExposedToolName('canva', 'design.export')).toBe('canva_design_export')
    expect(hubExposedToolName('canva', 'x'.repeat(200)).length).toBeLessThanOrEqual(128)
  })

  it('infers side effects from tool names', () => {
    expect(inferMcpToolSideEffect('personas_list')).toBe('read')
    expect(inferMcpToolSideEffect('persona_create')).toBe('write')
    expect(inferMcpToolSideEffect('persona_delete')).toBe('destructive')
  })

  it('redacts auth config to env key refs only', () => {
    expect(
      redactMcpServerAuthConfig({
        bearerEnvKey: 'AUDION_API_TOKEN',
        headerEnvKeys: { 'X-Service-Secret': 'PLEXON_SERVICE_SECRET' },
      }),
    ).toEqual({
      bearerEnvKey: 'AUDION_API_TOKEN',
      headerEnvKeys: { 'X-Service-Secret': 'PLEXON_SERVICE_SECRET' },
    })
  })

  it('resolves bearer from env', () => {
    process.env.MCP_HUB_TEST_TOKEN = 'secret-token'
    const { headers, error } = resolveMcpHubAuthHeaders('service_bearer', {
      bearerEnvKey: 'MCP_HUB_TEST_TOKEN',
    })
    expect(error).toBeUndefined()
    expect(headers.Authorization).toBe('Bearer secret-token')
    delete process.env.MCP_HUB_TEST_TOKEN
  })
})

describe('mcp-hub planner allowlist', () => {
  afterEach(() => {
    clearHubToolRuntimeState()
  })

  it('allows hub tools when allowlisted even without matching families', () => {
    __setHubToolAllowlistForTests(['canva_design_export'])
    expect(isHubAllowlistedTool('canva_design_export')).toBe(true)
    const plan = {
      intent: 'general_chat' as const,
      mode: 'tools' as const,
      toolFamilies: ['audion_persona'],
      allowWriteTools: false,
      maxToolRounds: 3,
      skipTools: false,
      reasoning: 'test',
      plannerSource: 'heuristic' as const,
    }
    expect(toolAllowedByPlan('canva_design_export', plan)).toBe(true)
    expect(toolAllowedByPlan('canva_design_export', { ...plan, skipTools: true })).toBe(false)
  })
})

describe('mcp-hub paths + migration', () => {
  it('exposes admin path constants', () => {
    expect(PATH_ADMIN_MCP_HUB).toBe('/admin/mcp-hub')
    expect(API_ADMIN_MCP_SERVERS).toBe('/api/admin/mcp-servers')
    expect(apiAdminMcpServer('abc')).toBe('/api/admin/mcp-servers/abc')
    expect(apiAdminMcpServerDiscover('abc')).toBe('/api/admin/mcp-servers/abc/discover')
  })

  it('has migration 0023 and source files', () => {
    const root = resolve(__dirname, '..')
    const migration = resolve(root, 'lib/db/migrations/0023_mcp_tool_hub.sql')
    expect(existsSync(migration)).toBe(true)
    const sql = readFileSync(migration, 'utf8')
    expect(sql).toContain('mcp_servers')
    expect(sql).toContain('mcp_server_tools')
    for (const rel of [
      'app/admin/mcp-hub/page.tsx',
      'app/admin/mcp-hub/[id]/page.tsx',
      'app/api/admin/mcp-servers/route.ts',
      'specs/domain/mcp-tool-hub.md',
    ]) {
      expect(existsSync(resolve(root, rel)), rel).toBe(true)
    }
  })
})
