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
import {
  applyHubRoutingWriteBoost,
  matchHubServersByRoutingHints,
  promptMatchesHubRoutingHints,
} from '@/lib/mcp-hub/routing-hints'
import { toolAllowedByPlan } from '@/lib/assistant/assistant-planner'
import { isConfirmationRequiredToolName } from '@/lib/assistant/orchestrator-complete'
import {
  __setHubToolAllowlistForTests,
  clearHubToolRuntimeState,
  isHubAllowlistedTool,
  isHubWriteTool,
} from '@/lib/mcp-hub/runtime'
import {
  API_ADMIN_MCP_SERVERS,
  API_ADMIN_MCP_SERVERS_BOOTSTRAP,
  API_PLATFORM_MCP_HUB_CANVA,
  PATH_ADMIN_MCP_HUB,
  apiAdminMcpServer,
  apiAdminMcpServerDiscover,
  apiAdminMcpServerPolicies,
  apiPlatformMcpHubOauthCallback,
  apiPlatformMcpHubOauthStart,
  apiPlatformMcpHubOauthStatus,
  apiPlatformProjectMcpHubServers,
} from '@/lib/constants'
import { createPkcePair } from '@/lib/mcp-hub/oauth'
import { CANVA_MCP_TOOLS } from '@/lib/mcp-hub/canva-mcp-handler'
import { decryptHubSecret, encryptHubSecret } from '@/lib/mcp-hub/token-crypto'
import { buildMcpOauthRequiredBlocks } from '@/lib/assistant/ui-blocks/build-mcp-oauth-ui'
import {
  DEFAULT_HUB_CAPABILITY_BY_EXPOSED,
  capabilityIdFromHubToolSync,
} from '@/lib/mcp-hub/catalog-bridge'
import { capabilityIdFromAgentTool } from '@/lib/capabilities/adapters/agent'

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

describe('mcp-hub routing hints (H2)', () => {
  it('matches prompts against routingHints', () => {
    expect(promptMatchesHubRoutingHints('Lege eine Persona an', ['persona', 'canva'])).toBe(true)
    expect(promptMatchesHubRoutingHints('Weather today', ['persona', 'canva'])).toBe(false)
    const matched = matchHubServersByRoutingHints('Canva Instagram Post', [
      { slug: 'canva', routingHints: ['canva', 'instagram'] },
      { slug: 'audion', routingHints: ['persona'] },
    ])
    expect(matched.map((s) => s.slug)).toEqual(['canva'])
  })

  it('boosts allowWriteTools only when write intent + hints match', () => {
    const servers = [{ slug: 'canva', routingHints: ['canva'] }]
    const noWrite = applyHubRoutingWriteBoost({
      prompt: 'Was kann Canva?',
      writeIntent: false,
      allowWriteTools: false,
      reasoning: 'base',
      matchedServers: servers,
    })
    expect(noWrite.matched).toBe(true)
    expect(noWrite.allowWriteTools).toBe(false)
    expect(noWrite.reasoning).toContain('Hub routing')

    const withWrite = applyHubRoutingWriteBoost({
      prompt: 'Erstelle Canva Design',
      writeIntent: true,
      allowWriteTools: false,
      reasoning: 'base',
      matchedServers: servers,
    })
    expect(withWrite.allowWriteTools).toBe(true)
    expect(withWrite.reasoning).toContain('Write')
  })
})

describe('mcp-hub planner allowlist', () => {
  afterEach(() => {
    clearHubToolRuntimeState()
  })

  it('allows hub read tools when allowlisted even without matching families', () => {
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

  it('blocks hub write tools when allowWriteTools=false (H2)', () => {
    __setHubToolAllowlistForTests(['canva_design_list'], {
      writeNames: ['canva_design_create'],
    })
    expect(isHubWriteTool('canva_design_create')).toBe(true)
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
    expect(toolAllowedByPlan('canva_design_list', plan)).toBe(true)
    expect(toolAllowedByPlan('canva_design_create', plan)).toBe(false)
    expect(toolAllowedByPlan('canva_design_create', { ...plan, allowWriteTools: true })).toBe(true)
  })

  it('requires confirm for hub confirm-tagged tools', () => {
    __setHubToolAllowlistForTests([], {
      confirmNames: ['canva_design_delete'],
    })
    expect(isConfirmationRequiredToolName('canva_design_delete')).toBe(true)
  })
})

describe('mcp-hub paths + migration', () => {
  it('exposes admin path constants', () => {
    expect(PATH_ADMIN_MCP_HUB).toBe('/admin/mcp-hub')
    expect(API_ADMIN_MCP_SERVERS).toBe('/api/admin/mcp-servers')
    expect(API_ADMIN_MCP_SERVERS_BOOTSTRAP).toBe('/api/admin/mcp-servers/bootstrap')
    expect(apiAdminMcpServer('abc')).toBe('/api/admin/mcp-servers/abc')
    expect(apiAdminMcpServerDiscover('abc')).toBe('/api/admin/mcp-servers/abc/discover')
    expect(apiAdminMcpServerPolicies('abc')).toBe('/api/admin/mcp-servers/abc/policies')
  })

  it('exposes H3 Canva OAuth path constants', () => {
    expect(API_PLATFORM_MCP_HUB_CANVA).toBe('/api/platform/mcp-hub/canva')
    expect(apiPlatformMcpHubOauthStart('canva')).toBe('/api/platform/mcp-hub/oauth/canva/start')
    expect(apiPlatformMcpHubOauthCallback('canva')).toBe(
      '/api/platform/mcp-hub/oauth/canva/callback',
    )
    expect(apiPlatformMcpHubOauthStatus('canva')).toBe('/api/platform/mcp-hub/oauth/canva/status')
  })

  it('exposes H4 collection Hub path constant', () => {
    expect(apiPlatformProjectMcpHubServers('proj-1')).toBe(
      '/api/platform/projects/proj-1/mcp-hub-servers',
    )
  })

  it('has migrations 0023–0026 and source files', () => {
    const root = resolve(__dirname, '..')
    const migration = resolve(root, 'lib/db/migrations/0023_mcp_tool_hub.sql')
    expect(existsSync(migration)).toBe(true)
    const sql = readFileSync(migration, 'utf8')
    expect(sql).toContain('mcp_servers')
    expect(sql).toContain('mcp_server_tools')
    const migrationH2 = resolve(root, 'lib/db/migrations/0024_mcp_tool_hub_policies.sql')
    expect(existsSync(migrationH2)).toBe(true)
    expect(readFileSync(migrationH2, 'utf8')).toContain('mcp_tool_policies')
    const migrationH3 = resolve(root, 'lib/db/migrations/0025_mcp_oauth_bindings.sql')
    expect(existsSync(migrationH3)).toBe(true)
    expect(readFileSync(migrationH3, 'utf8')).toContain('mcp_oauth_bindings')
    const migrationH4 = resolve(root, 'lib/db/migrations/0026_mcp_collection_servers.sql')
    expect(existsSync(migrationH4)).toBe(true)
    expect(readFileSync(migrationH4, 'utf8')).toContain('mcp_collection_servers')
    for (const rel of [
      'app/admin/mcp-hub/page.tsx',
      'app/admin/mcp-hub/[id]/page.tsx',
      'app/api/admin/mcp-servers/route.ts',
      'app/api/admin/mcp-servers/bootstrap/route.ts',
      'app/api/admin/mcp-servers/[id]/policies/route.ts',
      'app/api/platform/mcp-hub/canva/route.ts',
      'app/api/platform/mcp-hub/oauth/[slug]/start/route.ts',
      'app/api/platform/mcp-hub/oauth/[slug]/callback/route.ts',
      'app/api/platform/projects/[platformProjectId]/mcp-hub-servers/route.ts',
      'components/products/CollectionMcpHubPanel.tsx',
      'lib/mcp-hub/routing-hints.ts',
      'lib/mcp-hub/oauth.ts',
      'lib/mcp-hub/canva-mcp-handler.ts',
      'lib/mcp-hub/catalog-bridge.ts',
      'specs/domain/mcp-tool-hub.md',
      'specs/domain/mcp-hub-canva.md',
      'specs/domain/mcp-hub-collection-scope.md',
    ]) {
      expect(existsSync(resolve(root, rel)), rel).toBe(true)
    }
  })
})

describe('mcp-hub H3 oauth + canva', () => {
  it('encrypts and decrypts hub secrets', () => {
    process.env.MCP_HUB_TOKEN_ENCRYPTION_KEY = 'test-encryption-key-32chars!!'
    const enc = encryptHubSecret('access-token-value')
    expect(enc.startsWith('v1:')).toBe(true)
    expect(decryptHubSecret(enc)).toBe('access-token-value')
    delete process.env.MCP_HUB_TOKEN_ENCRYPTION_KEY
  })

  it('creates PKCE verifier/challenge pair', () => {
    const a = createPkcePair()
    const b = createPkcePair()
    expect(a.verifier).not.toEqual(b.verifier)
    expect(a.challenge).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(a.challenge).not.toEqual(a.verifier)
  })

  it('lists canva MCP tools', () => {
    expect(CANVA_MCP_TOOLS.map((t) => t.name)).toEqual([
      'brand_templates_list',
      'design_open_url',
      'design_export',
      'design_autofill',
    ])
  })

  it('builds oauth_required CTA blocks', () => {
    const blocks = buildMcpOauthRequiredBlocks(
      JSON.stringify({
        error: 'oauth_required',
        connectUrl: '/api/platform/mcp-hub/oauth/canva/start',
      }),
    )
    expect(blocks.some((b) => b.type === 'alert')).toBe(true)
    expect(blocks.some((b) => b.type === 'link_list')).toBe(true)
    expect(buildMcpOauthRequiredBlocks(JSON.stringify({ error: 'other' }))).toEqual([])
  })

  it('does not prefer canva when creation_scene_edit intent filters matches', () => {
    const matched = matchHubServersByRoutingHints('Canva Instagram Post im Editor', [
      { slug: 'canva', routingHints: ['canva', 'instagram'] },
      { slug: 'audion', routingHints: ['persona'] },
    ])
    const filtered = matched.filter((s) => s.slug !== 'canva')
    expect(filtered).toEqual([])
  })
})

describe('mcp-hub H4 catalog bridge', () => {
  it('maps default canva exposed names to hub.canva.* capabilities', () => {
    expect(DEFAULT_HUB_CAPABILITY_BY_EXPOSED.canva_brand_templates_list).toBe(
      'hub.canva.templates',
    )
    expect(capabilityIdFromHubToolSync('canva_brand_templates_list')).toBe('hub.canva.templates')
    expect(capabilityIdFromAgentTool('canva_brand_templates_list')).toBe('hub.canva.templates')
    expect(capabilityIdFromAgentTool('canva_design_export')).toBe('hub.canva.export')
  })
})
