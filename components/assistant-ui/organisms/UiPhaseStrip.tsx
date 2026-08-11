'use client'

import { ChatBlockPanel, ChatPhaseStrip } from '@msqdx/ui'
import type { phaseStripPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'

type Props = z.infer<typeof phaseStripPropsSchema>

/** Generative `phase_strip` — shared ChatPhaseStrip (Audion journey outline). */
export function UiPhaseStrip({ title, phases }: Props) {
  return (
    <div data-plexon-assistant-ui>
      <ChatBlockPanel title={title ?? 'Journey'} eyebrow="phases">
        <ChatPhaseStrip phases={phases} />
      </ChatBlockPanel>
    </div>
  )
}
