'use client'

import { ChatBlockPanel, ChatKeyValueList } from '@msqdx/ui'
import type { keyValueListPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'

type Props = z.infer<typeof keyValueListPropsSchema>

/** Generative `key_value_list` — shared ChatKeyValueList chrome. */
export function UiKeyValueList({ title, items }: Props) {
  return (
    <div data-plexon-assistant-ui>
      <ChatBlockPanel title={title} eyebrow="details">
        <ChatKeyValueList items={items} />
      </ChatBlockPanel>
    </div>
  )
}
