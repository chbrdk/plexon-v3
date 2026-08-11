'use client'

import { ChatBlockPanel, ChatEntityGrid } from '@msqdx/ui'
import type { personaCardPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'

type Props = z.infer<typeof personaCardPropsSchema> & {
  hideHeader?: boolean
  fullWidth?: boolean
}

export function personaCardGridTemplate(fullWidth?: boolean): string {
  return fullWidth ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))'
}

/** Generative `persona_card` — shared ChatEntityGrid (Audion-shaped). */
export function UiPersonaCardBlock({
  title,
  personas,
  hideHeader = false,
  fullWidth = false,
}: Props) {
  const grid = (
    <ChatEntityGrid
      fullWidth={fullWidth}
      items={personas.map((persona) => ({
        id: persona.id,
        title: persona.name,
        subtitle: persona.segment,
        description: persona.headline,
        badge: `${Math.round((persona.confidence ?? 0) * 100)}%`,
        tags: ['Persona'],
        accent: 'pink' as const,
        href: persona.actionHref,
      }))}
    />
  )

  if (hideHeader) {
    return (
      <div data-plexon-assistant-ui className="plexon-assistant-persona-cards">
        {grid}
      </div>
    )
  }

  return (
    <div data-plexon-assistant-ui className="plexon-assistant-persona-cards">
      <ChatBlockPanel title={title} eyebrow="personas">
        {grid}
      </ChatBlockPanel>
    </div>
  )
}
