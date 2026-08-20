import { describe, expect, it } from 'vitest'
import { resolveUseEchonMcp } from '@/lib/assistant/product-mcp-gate'
import { PLATFORM_ENTITLEMENT_STATUS } from '@/lib/platform-entitlements'
import { buildEchonIntegrationContextBlock } from '@/lib/integrations/echon-connectivity'
import { classifyToolFamily, READ_ONLY_QA_FAMILIES } from '@/lib/assistant/tool-catalog'
import { planAssistantTurnHeuristic } from '@/lib/assistant/assistant-planner'
import { isConfirmationRequiredToolName } from '@/lib/assistant/orchestrator-complete'
import { normalizeAssistantEmbedProduct } from '@/lib/paths/assistant-embed'

describe('resolveUseEchonMcp', () => {
  it('returns false when MCP URL is missing', () => {
    expect(
      resolveUseEchonMcp({
        echonEntitlement: { status: PLATFORM_ENTITLEMENT_STATUS.ACTIVE },
        pageContext: { product: 'echon' },
        mcpUrl: undefined,
      })
    ).toBe(false)
  })

  it('returns true with active echon entitlement', () => {
    expect(
      resolveUseEchonMcp({
        echonEntitlement: { status: PLATFORM_ENTITLEMENT_STATUS.ACTIVE },
        pageContext: null,
        mcpUrl: 'https://echon-mcp.example',
      })
    ).toBe(true)
  })

  it('returns true for ECHON embed pageContext', () => {
    expect(
      resolveUseEchonMcp({
        echonEntitlement: null,
        pageContext: { product: 'echon' },
        mcpUrl: 'https://echon-mcp.example',
      })
    ).toBe(true)
  })

  it('returns true from sibling shell without echon entitlement', () => {
    expect(
      resolveUseEchonMcp({
        echonEntitlement: null,
        pageContext: { product: 'plexon' },
        mcpUrl: 'https://echon-mcp.example',
      })
    ).toBe(true)
  })
})

describe('echon tool catalog + planner', () => {
  it('classifies expanded echon families', () => {
    expect(classifyToolFamily('echon_health')).toBe('echon_ops')
    expect(classifyToolFamily('echon_pipeline_metrics')).toBe('echon_ops')
    expect(classifyToolFamily('echon_foresight_momentum')).toBe('echon_foresight')
    expect(classifyToolFamily('echon_sources_list')).toBe('echon_corpus')
    expect(classifyToolFamily('echon_signals_list')).toBe('echon_signals')
    expect(READ_ONLY_QA_FAMILIES).toContain('echon_foresight')
  })

  it('plans echon_market for foresight prompts when MCP on', () => {
    const plan = planAssistantTurnHeuristic({
      prompt: 'Wie ist das Foresight-Momentum für E-Mobility?',
      hasProjectContext: false,
      hasCheckionMcp: false,
      hasAudionMcp: false,
      hasEchonMcp: true,
      hasBrandionMcp: false,
      hasCreationMcp: false,
      compactContextLoaded: false,
    })
    expect(plan.intent).toBe('echon_market')
    expect(plan.toolFamilies).toContain('echon_foresight')
  })

  it('requires confirmation for write tools', () => {
    expect(isConfirmationRequiredToolName('echon_research_run_start')).toBe(true)
    expect(isConfirmationRequiredToolName('echon_signal_ingest')).toBe(true)
    expect(isConfirmationRequiredToolName('echon_waves_detect')).toBe(true)
    expect(isConfirmationRequiredToolName('echon_signals_list')).toBe(false)
  })
})

describe('assistant embed product echon', () => {
  it('normalizes product=echon', () => {
    expect(normalizeAssistantEmbedProduct('echon')).toBe('echon')
  })
})

describe('echon connectivity block', () => {
  it('mentions gate when MCP off', async () => {
    const block = await buildEchonIntegrationContextBlock({ useEchonMcp: false })
    expect(block).toMatch(/resolveUseEchonMcp|deaktiviert/)
  })
})
