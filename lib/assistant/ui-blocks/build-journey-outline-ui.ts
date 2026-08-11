import { randomUUID } from 'crypto'
import type { UiBlock } from '@/lib/assistant/ui-blocks/types'
import { createUiBlock } from '@/lib/assistant/ui-blocks/validate'

export type JourneyPhaseOutlineInput = {
  id: string
  name: string
  summary?: string | null
  order?: number
}

export type JourneyMomentOutlineInput = {
  id?: string
  kind: 'action' | 'thought' | 'feeling' | 'pain' | 'opportunity' | 'other'
  label: string
}

/**
 * Build generative UI blocks for an Audion-shaped journey outline (phases + optional moments).
 * Product schemas stay outside DS — this only maps to `phase_strip` / `moment_list`.
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

  if (input.moments && input.moments.length > 0) {
    const momentBlock = createUiBlock(
      'moment_list',
      {
        title: input.momentsTitle ?? 'Moments',
        items: input.moments.map((m) => ({
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
