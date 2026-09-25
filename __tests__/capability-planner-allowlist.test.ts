import { afterEach, describe, expect, it, vi } from 'vitest'
import { toolAllowedByPlan, type AssistantPlan } from '@/lib/assistant/assistant-planner'
import {
  catalogCapabilityIdsForIntent,
  catalogPlannerToolOverride,
  catalogToolGate,
  listCatalogAgentIntentTypes,
  listCatalogAgentToolNames,
  resetCatalogPlannerAllowlistCache,
} from '@/lib/capabilities/planner-allowlist'
import { ENV_CAPABILITY_CATALOG_RUNTIME } from '@/lib/capabilities/runtime-flag'
import { getCapability, validateCapabilityCatalog } from '@/lib/capabilities'
import { capabilityIdFromAgentIntent } from '@/lib/capabilities/adapters/agent'

function basePlan(overrides: Partial<AssistantPlan> = {}): AssistantPlan {
  return {
    intent: 'brandion_brand',
    mode: 'tools',
    toolFamilies: ['brandion_guidelines', 'brandion_tokens', 'plexon_ui'],
    allowWriteTools: false,
    maxToolRounds: 5,
    skipTools: false,
    reasoning: 'test',
    ...overrides,
  }
}

describe('catalog planner allowlist', () => {
  afterEach(() => {
    delete process.env[ENV_CAPABILITY_CATALOG_RUNTIME]
    resetCatalogPlannerAllowlistCache()
    vi.unstubAllEnvs()
  })

  it('keeps catalog valid with Brandion agent bindings', () => {
    expect(validateCapabilityCatalog()).toEqual([])
    const brand = getCapability('brandion.brand_measure')
    expect(brand?.agent?.intentTypes).toContain('brandion_brand')
    expect(brand?.agent?.toolNames).toContain('brandion_tokens_list')
    expect(capabilityIdFromAgentIntent('brandion_brand')).toBe('brandion.brand_measure')
    expect(capabilityIdFromAgentIntent('checkion_scan')).toBe('checkion.scan')
    expect(catalogCapabilityIdsForIntent('videon_media')).toContain('videon.media.search')
  })

  it('lists agent tool names and intent types from catalog', () => {
    expect(listCatalogAgentToolNames()).toContain('checkion_scan_single')
    expect(listCatalogAgentIntentTypes()).toEqual(
      expect.arrayContaining(['brandion_brand', 'checkion_scan', 'metron_analytics', 'videon_media']),
    )
  })

  it('gates tools when runtime is on', () => {
    expect(catalogToolGate('brandion_tokens_list', 'brandion_brand')).toBe('allow')
    expect(catalogToolGate('brandion_tokens_list', 'checkion_scan')).toBe('pass')
    expect(catalogToolGate('unknown_tool_xyz', 'brandion_brand')).toBe('pass')

    expect(catalogPlannerToolOverride('brandion_tokens_list', 'brandion_brand')).toBeNull()

    process.env[ENV_CAPABILITY_CATALOG_RUNTIME] = '1'
    expect(catalogPlannerToolOverride('brandion_tokens_list', 'brandion_brand')).toBe(true)
    expect(catalogPlannerToolOverride('brandion_tokens_list', 'checkion_scan')).toBeNull()
  })

  it('toolAllowedByPlan force-allows catalog tools when runtime on', () => {
    const plan = basePlan({ toolFamilies: ['plexon_ui'] })
    expect(toolAllowedByPlan('brandion_tokens_list', plan)).toBe(false)

    process.env[ENV_CAPABILITY_CATALOG_RUNTIME] = '1'
    expect(toolAllowedByPlan('brandion_tokens_list', plan)).toBe(true)
    expect(toolAllowedByPlan('checkion_scan_single', plan)).toBe(false)
  })
})
