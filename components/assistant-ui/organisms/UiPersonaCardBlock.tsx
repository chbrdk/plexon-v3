'use client'

import type { personaCardPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'
import { PlexonEntityCard } from '@/components/assistant-ui/molecules/PlexonEntityCard'
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface'

type Props = z.infer<typeof personaCardPropsSchema> & {
  /** Omit block header (e.g. when parent panel already shows section title). */
  hideHeader?: boolean
  /** Single column — card spans full container width. */
  fullWidth?: boolean
}

export function personaCardGridTemplate(fullWidth?: boolean): string {
  return fullWidth ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))'
}

export function UiPersonaCardBlock({
  title,
  personas,
  hideHeader = false,
  fullWidth = false,
}: Props) {
  const cards = (
    <div
      className={`plexon-assistant-entity-grid${fullWidth ? ' is-full' : ''}`}
      style={{ gridTemplateColumns: personaCardGridTemplate(fullWidth) }}
    >
      {personas.map((persona) => (
        <PlexonEntityCard
          key={persona.id}
          brandColor="pink"
          title={persona.name}
          subtitle={persona.segment}
          description={persona.headline}
          badge={`${Math.round((persona.confidence ?? 0) * 100)}%`}
          stats={[{ label: 'Persona', brand: 'pink' }]}
          onClick={
            persona.actionHref
              ? () => window.open(persona.actionHref, '_blank', 'noopener,noreferrer')
              : undefined
          }
        />
      ))}
    </div>
  )

  if (hideHeader) {
    return (
      <div data-plexon-assistant-ui className="plexon-assistant-persona-cards">
        {cards}
      </div>
    )
  }

  return (
    <UiBlockSurface title={title} eyebrow="personas" className="plexon-assistant-persona-cards">
      {cards}
    </UiBlockSurface>
  )
}
