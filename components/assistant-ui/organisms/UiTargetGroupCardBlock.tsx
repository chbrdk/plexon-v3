'use client'

import { ChatBlockPanel, ChatEntityGrid } from '@msqdx/ui'
import type { targetGroupCardPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'

type Props = z.infer<typeof targetGroupCardPropsSchema>

/** Generative `target_group_card` — shared ChatEntityGrid (audience teasers). */
export function UiTargetGroupCardBlock({ title, targetGroups }: Props) {
  return (
    <div data-plexon-assistant-ui>
      <ChatBlockPanel title={title} eyebrow="audiences">
        <ChatEntityGrid
          items={targetGroups.map((tg) => ({
            id: tg.id,
            title: tg.name,
            subtitle: tg.segment,
            description: tg.description,
            tags: [`${tg.personaCount} Personas`, `${tg.knowledgeEntryCount} Knowledge`],
            accent: 'green' as const,
            href: tg.actionHref,
          }))}
        />
      </ChatBlockPanel>
    </div>
  )
}
