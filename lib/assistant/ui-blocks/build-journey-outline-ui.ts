import { randomUUID } from 'crypto'
import type { UiBlock, UiLayout } from '@/lib/assistant/ui-blocks/types'
import { UI_LAYOUT_VERSION } from '@/lib/assistant/ui-blocks/types'
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate'

export type JourneyPhaseOutlineInput = {
  id: string
  name: string
  summary?: string | null
  order?: number
  elements?: JourneyMomentOutlineInput[]
}

export type JourneyMomentOutlineInput = {
  id?: string
  kind: 'action' | 'thought' | 'feeling' | 'pain' | 'opportunity' | 'other'
  label: string
}

export type JourneyQuoteOutlineInput = {
  quote: string
  attribution?: string
  context?: string
  tone?: 'neutral' | 'success' | 'warning' | 'error' | 'info'
}

export type JourneyFindingOutlineInput = {
  title: string
  description: string
  severity?: 'neutral' | 'success' | 'warning' | 'error' | 'info'
}

export type JourneyRecommendationOutlineInput = {
  title: string
  description?: string
  priority?: number
  category?: string
}

/**
 * Build generative UI blocks for an Audion-shaped journey outline (phases + optional moments).
 */
export function buildJourneyOutlineBlocks(input: {
  title?: string
  phases: JourneyPhaseOutlineInput[]
  activePhaseId?: string
  momentsTitle?: string
  moments?: JourneyMomentOutlineInput[]
}): UiBlock[] {
  const blocks: UiBlock[] = []
  const sorted = [...input.phases].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const phaseBlock = createUiBlock(
    'phase_strip',
    {
      title: input.title ?? 'Journey outline',
      phases: sorted.map((phase, index) => {
        const active = input.activePhaseId
          ? phase.id === input.activePhaseId
          : index === 0
        let status: 'upcoming' | 'current' | 'done' = 'upcoming'
        if (active) status = 'current'
        else if (input.activePhaseId) {
          const activeIndex = sorted.findIndex((p) => p.id === input.activePhaseId)
          if (activeIndex >= 0 && index < activeIndex) status = 'done'
        }
        return {
          id: phase.id,
          label: phase.name,
          summary: phase.summary ?? undefined,
          active,
          status,
        }
      }),
    },
    randomUUID(),
  )
  if (phaseBlock.ok) blocks.push(phaseBlock.block)

  const moments =
    input.moments ??
    sorted.find((p) => p.id === input.activePhaseId)?.elements ??
    sorted[0]?.elements

  if (moments && moments.length > 0) {
    const activePhase = sorted.find((p) => p.id === input.activePhaseId) ?? sorted[0]
    const momentBlock = createUiBlock(
      'moment_list',
      {
        title:
          input.momentsTitle ??
          (activePhase ? `${activePhase.name} · Moments` : 'Moments'),
        items: moments.map((m) => ({
          id: m.id,
          kind: m.kind,
          label: m.label,
        })),
      },
      randomUUID(),
    )
    if (momentBlock.ok) blocks.push(momentBlock.block)
  }

  return blocks
}

/**
 * Full journey chat layout: outline + validate quotes/findings/recs + deep link.
 * Call from tools/handlers once journey detail (or validate) is fetched.
 */
export function buildJourneyDetailLayout(input: {
  journeyId: string
  journeyName: string
  journeyHref?: string
  phases: JourneyPhaseOutlineInput[]
  activePhaseId?: string
  quotes?: JourneyQuoteOutlineInput[]
  findings?: JourneyFindingOutlineInput[]
  recommendations?: JourneyRecommendationOutlineInput[]
  error?: string
}): UiLayout {
  const blocks: UiBlock[] = []

  blocks.push(
    ...buildJourneyOutlineBlocks({
      title: input.journeyName,
      phases: input.phases,
      activePhaseId: input.activePhaseId,
    }),
  )

  if (input.quotes && input.quotes.length > 0) {
    const quotes = createUiBlock(
      'quote_list',
      {
        title: 'Persona-Stimmen',
        items: input.quotes,
      },
      randomUUID(),
    )
    if (quotes.ok) blocks.push(quotes.block)
  }

  if (input.findings && input.findings.length > 0) {
    const findings = createUiBlock(
      'finding_list',
      {
        title: 'Validate · Erkenntnisse',
        items: input.findings,
      },
      randomUUID(),
    )
    if (findings.ok) blocks.push(findings.block)
  }

  if (input.recommendations && input.recommendations.length > 0) {
    const recs = createUiBlock(
      'recommendation_list',
      {
        title: 'Validate · Empfehlungen',
        items: input.recommendations,
      },
      randomUUID(),
    )
    if (recs.ok) blocks.push(recs.block)
  }

  if (input.journeyHref) {
    const links = createUiBlock(
      'link_list',
      {
        title: 'Weiter',
        links: [{ label: 'In AUDION öffnen', href: input.journeyHref, external: true }],
      },
      randomUUID(),
    )
    if (links.ok) blocks.push(links.block)
  }

  if (input.error) {
    const alert = createUiBlock(
      'alert',
      { title: 'Journey', message: input.error, tone: 'warning' },
      randomUUID(),
    )
    if (alert.ok) blocks.push(alert.block)
  }

  return { version: UI_LAYOUT_VERSION, blocks }
}
