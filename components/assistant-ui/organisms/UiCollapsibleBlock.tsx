'use client'

import { useState } from 'react'
import { Button, Text } from '@msqdx/ui'
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface'
import { AssistantChatAnswer } from '@/components/assistant/AssistantChatAnswer'

type UiCollapsibleBlockProps = {
  title: string
  markdown: string
  defaultOpen?: boolean
}

export function UiCollapsibleBlock({ title, markdown, defaultOpen = false }: UiCollapsibleBlockProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <UiBlockSurface className="plexon-assistant-collapsible">
      <Button
        type="button"
        variant="ghost"
        className="plexon-assistant-collapsible-trigger"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Text role="title" as="span" className="plexon-assistant-collapsible-title">
          {title}
        </Text>
        <Text role="meta" as="span" aria-hidden>
          {open ? '▾' : '▸'}
        </Text>
      </Button>
      {open ? (
        <div className="plexon-assistant-collapsible-body">
          <AssistantChatAnswer answer={markdown} />
        </div>
      ) : null}
    </UiBlockSurface>
  )
}
