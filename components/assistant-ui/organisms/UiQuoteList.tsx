'use client'

import { ChatBlockPanel, ChatQuoteList } from '@msqdx/ui'
import type { quoteListPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'

type Props = z.infer<typeof quoteListPropsSchema>

/** Generative `quote_list` — shared ChatQuoteList (journey validate voices). */
export function UiQuoteList({ title, items }: Props) {
  return (
    <div data-plexon-assistant-ui>
      <ChatBlockPanel title={title ?? 'Persona-Stimmen'} eyebrow="validate">
        <ChatQuoteList items={items} />
      </ChatBlockPanel>
    </div>
  )
}
