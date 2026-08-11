'use client'

import { ChatBlockList, ChatBlockPanel } from '@msqdx/ui'
import type { findingListPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'
import type { UiTone } from '@/lib/assistant/ui-blocks/types'

type Props = z.infer<typeof findingListPropsSchema> & {
  showSeverityBadge?: boolean
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

/** Generative `finding_list` — shared ChatBlockList chrome. */
export function UiFindingList({
  title,
  items,
  showSeverityBadge = true,
  itemTint = false,
}: Props) {
  return (
    <div data-plexon-assistant-ui>
      <ChatBlockPanel title={title ?? 'Erkenntnisse'} eyebrow="findings">
        <ChatBlockList
          alternating={!itemTint}
          items={items.map((item) => {
            const tone = item.severity ?? 'neutral'
            const badge = showSeverityBadge ? severityLabel(item.severity) ?? undefined : undefined
            return {
              title: item.title,
              description: item.description?.trim() || undefined,
              badge,
              tone,
            }
          })}
        />
      </ChatBlockPanel>
    </div>
  )
}
