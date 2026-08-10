'use client'

import type { targetGroupCardPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'
import { PlexonEntityCard } from '@/components/assistant-ui/molecules/PlexonEntityCard'
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface'

type Props = z.infer<typeof targetGroupCardPropsSchema>

export function UiTargetGroupCardBlock({ title, targetGroups }: Props) {
  return (
    <UiBlockSurface title={title} eyebrow="audiences">
      <div className="plexon-assistant-entity-grid">
        {targetGroups.map((tg) => (
          <PlexonEntityCard
            key={tg.id}
            brandColor="neutral"
            title={tg.name}
            subtitle={tg.segment}
            description={tg.description}
            stats={[
              { label: `${tg.personaCount} Personas`, brand: 'pink' },
              { label: `${tg.knowledgeEntryCount} Knowledge`, brand: 'green' },
            ]}
            onClick={
              tg.actionHref
                ? () => window.open(tg.actionHref, '_blank', 'noopener,noreferrer')
                : undefined
            }
          />
        ))}
      </div>
    </UiBlockSurface>
  )
}
