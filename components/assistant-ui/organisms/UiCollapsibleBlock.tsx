'use client'

import { ChatCollapsible } from '@msqdx/ui'
import { AssistantChatAnswer } from '@/components/assistant/AssistantChatAnswer'

type UiCollapsibleBlockProps = {
  title: string
  markdown: string
  defaultOpen?: boolean
}

/** Generative `collapsible` — shared ChatCollapsible; markdown stays product-owned. */
export function UiCollapsibleBlock({ title, markdown, defaultOpen = false }: UiCollapsibleBlockProps) {
  return (
    <div data-plexon-assistant-ui className="plexon-assistant-collapsible">
      <ChatCollapsible title={title} defaultOpen={defaultOpen}>
        <AssistantChatAnswer answer={markdown} />
      </ChatCollapsible>
    </div>
  )
}
