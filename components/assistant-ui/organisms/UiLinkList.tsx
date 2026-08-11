'use client'

import { ChatBlockPanel, ChatLinkList } from '@msqdx/ui'
import type { linkListPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'

type Props = z.infer<typeof linkListPropsSchema>

/** Generative `link_list` — shared ChatLinkList chrome. */
export function UiLinkList({ title, links }: Props) {
  return (
    <div data-plexon-assistant-ui>
      <ChatBlockPanel title={title} eyebrow="links" className="plexon-assistant-link-list">
        <ChatLinkList links={links} />
      </ChatBlockPanel>
    </div>
  )
}
