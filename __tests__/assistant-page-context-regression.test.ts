/**
 * Wave 4 harden — cross-app pageContext regression matrix.
 * Spec: specs/domain/assistant-page-context.md § Example flows / Acceptance
 * Checklist: knowledge/assistant-page-context-rollout.md
 */
import { describe, expect, it } from 'vitest'
import {
  ASSISTANT_ENTITY_DOMAIN_SCAN,
  ASSISTANT_ENTITY_GUIDELINE,
  ASSISTANT_ENTITY_PERSONA,
  ASSISTANT_ENTITY_VIDEON_CUT,
  ASSISTANT_ENTITY_VIDEON_MEDIA,
  parseAssistantPageContext,
  type AssistantPageContext,
} from '@/lib/assistant/page-context'
import {
  injectAudionToolArgs,
  injectBrandionToolArgs,
  injectCheckionToolArgs,
  injectVideonToolArgs,
} from '@/lib/assistant/creation-scene-tool-args'
import { resolveMcpFlagsForPlan } from '@/lib/assistant/mcp-flags-for-plan'
import {
  resolveUseAudionMcp,
  resolveUseBrandionMcp,
  resolveUseCheckionMcp,
} from '@/lib/assistant/product-mcp-gate'
import { preferPageEntityPlan, planAssistantTurnHeuristic } from '@/lib/assistant/assistant-planner'
import type { AssistantPlan } from '@/lib/assistant/assistant-planner'

const COLLECTION = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'

/** Surfaces that MUST ship a complete pageContext (Collection + entity when on detail). */
const SURFACE_MATRIX: Array<{
  label: string
  pageContext: AssistantPageContext
  requireEntity: boolean
}> = [
  {
    label: 'Checkion domain scan',
    pageContext: {
      product: 'checkion',
      pathname: '/results/ds-1/overview',
      platformProjectId: COLLECTION,
      entityType: ASSISTANT_ENTITY_DOMAIN_SCAN,
      entityId: 'ds-1',
    },
    requireEntity: true,
  },
  {
    label: 'Audion persona detail',
    pageContext: {
      product: 'audion',
      pathname: '/personas/p-1',
      platformProjectId: COLLECTION,
      entityType: ASSISTANT_ENTITY_PERSONA,
      entityId: 'p-1',
    },
    requireEntity: true,
  },
  {
    label: 'Brandion guideline studio',
    pageContext: {
      product: 'brandion',
      pathname: '/guidelines/g-1',
      platformProjectId: COLLECTION,
      entityType: ASSISTANT_ENTITY_GUIDELINE,
      entityId: 'g-1',
    },
    requireEntity: true,
  },
  {
    label: 'Videon media editor',
    pageContext: {
      product: 'videon',
      pathname: '/media/m-1',
      platformProjectId: COLLECTION,
      entityType: ASSISTANT_ENTITY_VIDEON_MEDIA,
      entityId: 'm-1',
    },
    requireEntity: true,
  },
  {
    label: 'Videon cut editor',
    pageContext: {
      product: 'videon',
      pathname: '/cuts/c-1',
      platformProjectId: COLLECTION,
      entityType: ASSISTANT_ENTITY_VIDEON_CUT,
      entityId: 'c-1',
    },
    requireEntity: true,
  },
  {
    label: 'Echon signal detail',
    pageContext: {
      product: 'echon',
      pathname: '/signals/s-1',
      platformProjectId: COLLECTION,
      entityType: 'signal',
      entityId: 's-1',
    },
    requireEntity: true,
  },
  {
    label: 'Plexon Collection hub',
    pageContext: {
      product: 'plexon',
      pathname: `/projects/${COLLECTION}`,
      platformProjectId: COLLECTION,
    },
    requireEntity: false,
  },
]

const allMcpOn = {
  useCheckionMcp: true,
  useAudionMcp: true,
  useEchonMcp: true,
  useBrandionMcp: true,
  useCreationMcp: true,
  useSpirionMcp: true,
  useVideonMcp: true,
  useMetronMcp: true,
}

function plan(intent: AssistantPlan['intent']): AssistantPlan {
  return {
    intent,
    mode: 'hybrid',
    toolFamilies: [],
    allowWriteTools: false,
    maxToolRounds: 4,
    skipTools: false,
    reasoning: 'test',
    plannerSource: 'heuristic',
  }
}

describe('assistant page context — cross-app regression matrix', () => {
  it.each(SURFACE_MATRIX)(
    '$label parses with Collection (+ entity when required)',
    ({ pageContext, requireEntity }) => {
      const parsed = parseAssistantPageContext(pageContext)
      expect(parsed).not.toBeNull()
      expect(parsed!.platformProjectId).toBe(COLLECTION)
      expect(parsed!.product).toBe(pageContext.product)
      expect(parsed!.pathname).toBe(pageContext.pathname)
      if (requireEntity) {
        expect(parsed!.entityType).toBe(pageContext.entityType)
        expect(parsed!.entityId).toBe(pageContext.entityId)
      }
    },
  )

  it('A — Checkion domain_scan injects scan id (no re-ask)', () => {
    const out = injectCheckionToolArgs(
      'checkion_v3_domain_scan_overview',
      {},
      {
        actorUserId: 'u1',
        pageContext: SURFACE_MATRIX[0]!.pageContext,
      },
    )
    expect(out.domain_scan_id).toBe('ds-1')
  })

  it('B — Brandion Collection scopes Audion personas_list', () => {
    const out = injectAudionToolArgs(
      'audion_personas_list',
      {},
      {
        actorUserId: 'u1',
        audionProjectId: 'aud-mirror',
        platformProjectId: COLLECTION,
        pageContext: SURFACE_MATRIX[2]!.pageContext,
      },
    )
    expect(out.project_id).toBe('aud-mirror')
    expect(out.platformProjectId).toBe(COLLECTION)
  })

  it('C — Audion persona detail injects persona id', () => {
    const out = injectAudionToolArgs(
      'audion_persona_get',
      {},
      {
        actorUserId: 'u1',
        audionProjectId: 'aud-mirror',
        pageContext: SURFACE_MATRIX[1]!.pageContext,
      },
    )
    expect(out.personaId).toBe('p-1')
    expect(out.id).toBe('p-1')
  })

  it('Brandion guideline injects entity id', () => {
    const out = injectBrandionToolArgs(
      'brandion_guideline_get',
      {},
      {
        actorUserId: 'u1',
        pageContext: SURFACE_MATRIX[2]!.pageContext,
      },
    )
    expect(out.guidelineId ?? out.id).toBe('g-1')
  })

  it('Videon media/cut inject entity ids', () => {
    const media = injectVideonToolArgs(
      'videon_media_get',
      {},
      { actorUserId: 'u1', pageContext: SURFACE_MATRIX[3]!.pageContext },
    )
    expect(media.mediaId ?? media.id).toBe('m-1')

    const cut = injectVideonToolArgs(
      'videon_cut_get',
      {},
      { actorUserId: 'u1', pageContext: SURFACE_MATRIX[4]!.pageContext },
    )
    expect(cut.cutId ?? cut.id).toBe('c-1')
  })

  it('deixis: dieser Scan / fasse sie / dieses Guideline', () => {
    const scanPlan = preferPageEntityPlan(
      planAssistantTurnHeuristic({
        prompt: 'Insights zu diesem Scan?',
        hasProjectContext: true,
        hasCheckionMcp: true,
        hasAudionMcp: true,
        hasEchonMcp: false,
        hasBrandionMcp: false,
        hasCreationMcp: false,
        compactContextLoaded: false,
        pageContext: SURFACE_MATRIX[0]!.pageContext,
      }),
      {
        prompt: 'Insights zu diesem Scan?',
        hasProjectContext: true,
        hasCheckionMcp: true,
        hasAudionMcp: true,
        hasEchonMcp: false,
        hasBrandionMcp: false,
        hasCreationMcp: false,
        compactContextLoaded: false,
        pageContext: SURFACE_MATRIX[0]!.pageContext,
      },
    )
    expect(scanPlan.intent).toBe('checkion_scan')

    const personaPlan = preferPageEntityPlan(
      planAssistantTurnHeuristic({
        prompt: 'Fasse sie zusammen.',
        hasProjectContext: true,
        hasCheckionMcp: false,
        hasAudionMcp: true,
        hasEchonMcp: false,
        hasBrandionMcp: false,
        hasCreationMcp: false,
        compactContextLoaded: false,
        pageContext: SURFACE_MATRIX[1]!.pageContext,
      }),
      {
        prompt: 'Fasse sie zusammen.',
        hasProjectContext: true,
        hasCheckionMcp: false,
        hasAudionMcp: true,
        hasEchonMcp: false,
        hasBrandionMcp: false,
        hasCreationMcp: false,
        compactContextLoaded: false,
        pageContext: SURFACE_MATRIX[1]!.pageContext,
      },
    )
    expect(personaPlan.intent).toBe('audion_persona')

    const guidelinePlan = preferPageEntityPlan(
      planAssistantTurnHeuristic({
        prompt: 'Was sagt dieses Guideline?',
        hasProjectContext: true,
        hasCheckionMcp: false,
        hasAudionMcp: false,
        hasEchonMcp: false,
        hasBrandionMcp: true,
        hasCreationMcp: false,
        compactContextLoaded: false,
        pageContext: SURFACE_MATRIX[2]!.pageContext,
      }),
      {
        prompt: 'Was sagt dieses Guideline?',
        hasProjectContext: true,
        hasCheckionMcp: false,
        hasAudionMcp: false,
        hasEchonMcp: false,
        hasBrandionMcp: true,
        hasCreationMcp: false,
        compactContextLoaded: false,
        pageContext: SURFACE_MATRIX[2]!.pageContext,
      },
    )
    expect(guidelinePlan.intent).toBe('brandion_brand')
  })
})

describe('assistant page context — MCP gate Collection cross-ask', () => {
  it('product shell host enables sibling MCPs without matching entitlement', () => {
    for (const host of ['brandion', 'checkion', 'audion', 'plexon', 'echon'] as const) {
      expect(
        resolveUseAudionMcp({
          audionEntitlement: null,
          pageContext: { product: host },
          mcpUrl: 'https://mcp-audion.example',
        }),
      ).toBe(true)
      expect(
        resolveUseBrandionMcp({
          brandionEntitlement: null,
          pageContext: { product: host },
          mcpUrl: 'https://brandion-mcp.example',
        }),
      ).toBe(true)
      expect(
        resolveUseCheckionMcp({
          checkionEntitlement: null,
          pageContext: { product: host },
          mcpUrl: 'https://checkion-mcp.example',
        }),
      ).toBe(true)
    }
  })

  it('plan narrowing keeps Collection siblings for brandion / checkion / audion', () => {
    expect(resolveMcpFlagsForPlan(plan('brandion_brand'), allMcpOn).useAudionMcp).toBe(true)
    expect(resolveMcpFlagsForPlan(plan('checkion_scan'), allMcpOn).useAudionMcp).toBe(true)
    expect(resolveMcpFlagsForPlan(plan('checkion_scan'), allMcpOn).useBrandionMcp).toBe(true)
    expect(resolveMcpFlagsForPlan(plan('audion_persona'), allMcpOn).useBrandionMcp).toBe(true)
  })
})
