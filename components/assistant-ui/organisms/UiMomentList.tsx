'use client'

import { ChatBlockPanel, ChatMomentList } from '@msqdx/ui'
import type { momentListPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'

type Props = z.infer<typeof momentListPropsSchema>

/** Generative `moment_list` — shared ChatMomentList (typed journey elements). */
export function UiMomentList({ title, items }: Props) {
  return (
    <div data-plexon-assistant-ui>
      <ChatBlockPanel title={title ?? 'Moments'} eyebrow="moments">
        <ChatMomentList items={items} />
      </ChatBlockPanel>
    </div>
  )
}
