'use client'

import type { findingListPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'
import { UiBadge } from '@/components/assistant-ui/atoms/UiBadge'
import { UiText } from '@/components/assistant-ui/atoms/UiText'
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface'
import type { UiTone } from '@/lib/assistant/ui-blocks/types'

type Props = z.infer<typeof findingListPropsSchema> & {
  /** Hide severity chips (e.g. persona goals with tinted rows). */
  showSeverityBadge?: boolean
  /** Apply a full-row semantic tint instead of alternating stripes. */
  itemTint?: boolean
}

function severityLabel(severity: UiTone | undefined): string | null {
  switch (severity) {
    case 'error':
      return 'Kritisch'
    case 'warning':
      return 'Warnung'
    case 'success':
      return 'Positiv'
    case 'info':
      return 'Hinweis'
    default:
      return null
  }
}

export function UiFindingList({
  title,
  items,
  showSeverityBadge = true,
  itemTint = false,
}: Props) {
  return (
    <UiBlockSurface title={title ?? 'Erkenntnisse'} eyebrow="findings">
      <ul className="plexon-assistant-list">
        {items.map((item, index) => {
          const tone = item.severity ?? 'neutral'
          const badge = showSeverityBadge ? severityLabel(item.severity) : null
          const description = item.description?.trim()
          return (
            <li
              key={`${item.title}-${index}`}
              className={[
                'plexon-assistant-list-item',
                itemTint ? `is-tint is-${tone}` : index % 2 === 1 ? 'is-alt' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="plexon-assistant-list-item-head">
                <UiText variant="subtitle2" tone={itemTint ? 'neutral' : tone}>
                  {item.title}
                </UiText>
                {badge ? <UiBadge label={badge} tone={tone} /> : null}
              </div>
              {description ? <UiText tone="neutral">{description}</UiText> : null}
            </li>
          )
        })}
      </ul>
    </UiBlockSurface>
  )
}
