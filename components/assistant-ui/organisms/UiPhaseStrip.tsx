'use client'

import { useState } from 'react'
import { ChatBlockPanel, ChatMomentList, ChatPhaseStrip } from '@msqdx/ui'
import type { phaseStripPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'

type Props = z.infer<typeof phaseStripPropsSchema>
type Phase = Props['phases'][number]

function phaseStatuses(phases: Phase[], activeId: string): Phase[] {
  const activeIndex = phases.findIndex((p) => p.id === activeId)
  return phases.map((phase, index) => {
    let status: 'upcoming' | 'current' | 'done' = 'upcoming'
    if (phase.id === activeId) status = 'current'
    else if (activeIndex >= 0 && index < activeIndex) status = 'done'
    return {
      ...phase,
      active: phase.id === activeId,
      status,
    }
  })
}

/**
 * Generative `phase_strip` — interactive when phases embed `moments`
 * (click phase → Moments panel). Spec: assistant-journey-outline interactive.
 */
export function UiPhaseStrip({ title, phases }: Props) {
  const hasEmbeddedMoments = phases.some((p) => (p.moments?.length ?? 0) > 0)
  const initialId =
    phases.find((p) => p.active)?.id ?? phases[0]?.id ?? ''
  const [activeId, setActiveId] = useState(initialId)

  const displayPhases = phaseStatuses(phases, activeId || initialId)
  const activePhase = displayPhases.find((p) => p.id === activeId) ?? displayPhases[0]
  const moments = activePhase?.moments ?? []

  return (
    <div data-plexon-assistant-ui data-journey-outline-interactive={hasEmbeddedMoments ? 'true' : undefined}>
      <ChatBlockPanel title={title ?? 'Journey'} eyebrow="phases">
        <ChatPhaseStrip
          phases={displayPhases.map(({ moments: _m, ...phase }) => phase)}
          onPhaseActivate={
            hasEmbeddedMoments
              ? (phase) => {
                  setActiveId(phase.id)
                }
              : undefined
          }
        />
      </ChatBlockPanel>
      {hasEmbeddedMoments && moments.length > 0 ? (
        <ChatBlockPanel
          title={activePhase ? `${activePhase.label} · Moments` : 'Moments'}
          eyebrow="moments"
        >
          <ChatMomentList items={moments} />
        </ChatBlockPanel>
      ) : null}
    </div>
  )
}
