'use client'

import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface'
import { AssistantChatAnswer } from '@/components/assistant/AssistantChatAnswer'

type UiMarkdownBlockProps = {
  markdown: string
}

export function UiMarkdownBlock({ markdown }: UiMarkdownBlockProps) {
  return (
    <UiBlockSurface className="plexon-assistant-markdown-block">
      <AssistantChatAnswer answer={markdown} />
    </UiBlockSurface>
  )
}
