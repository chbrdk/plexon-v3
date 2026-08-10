'use client'

import type { recommendationListPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'
import { UiBadge } from '@/components/assistant-ui/atoms/UiBadge'
import { UiText } from '@/components/assistant-ui/atoms/UiText'
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface'

type Props = z.infer<typeof recommendationListPropsSchema>

function priorityTone(priority: number | undefined): 'error' | 'warning' | 'info' | 'neutral' {
  if (priority == null) return 'neutral'
  if (priority <= 2) return 'error'
  if (priority === 3) return 'warning'
  return 'info'
}

export function UiRecommendationList({ title, items }: Props) {
  return (
    <UiBlockSurface title={title ?? 'Handlungsempfehlungen'} eyebrow="actions">
      <ul className="plexon-assistant-list">
        {items.map((item, index) => {
          const tone = priorityTone(item.priority)
          return (
            <li
              key={`${item.title}-${index}`}
              className={`plexon-assistant-list-item${index % 2 === 1 ? ' is-alt' : ''}`}
            >
              <div className="plexon-assistant-list-item-head">
                <UiText variant="subtitle2">{item.title}</UiText>
                {item.priority != null ? <UiBadge label={`P${item.priority}`} tone={tone} /> : null}
                {item.category ? <UiBadge label={item.category} tone="neutral" /> : null}
              </div>
              {item.description ? <UiText tone="neutral">{item.description}</UiText> : null}
            </li>
          )
        })}
      </ul>
    </UiBlockSurface>
  )
}
