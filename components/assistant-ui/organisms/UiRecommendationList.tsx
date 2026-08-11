'use client'

import { ChatBlockList, ChatBlockPanel, type ChatBlockListTone } from '@msqdx/ui'
import type { recommendationListPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'

type Props = z.infer<typeof recommendationListPropsSchema>

function priorityTone(priority: number | undefined): ChatBlockListTone {
  if (priority == null) return 'neutral'
  if (priority <= 2) return 'error'
  if (priority === 3) return 'warning'
  return 'info'
}

/** Generative `recommendation_list` — shared ChatBlockList chrome. */
export function UiRecommendationList({ title, items }: Props) {
  return (
    <div data-plexon-assistant-ui>
      <ChatBlockPanel title={title ?? 'Handlungsempfehlungen'} eyebrow="actions">
        <ChatBlockList
          items={items.map((item) => ({
            title: item.title,
            description: item.description,
            badge: item.priority != null ? `P${item.priority}` : undefined,
            chips: item.category ? [{ label: item.category }] : undefined,
            tone: priorityTone(item.priority),
          }))}
        />
      </ChatBlockPanel>
    </div>
  )
}
