'use client'

import { Panel, Text } from '@msqdx/ui'
import type { cornerTabSectionPropsSchema } from '@/lib/assistant/ui-blocks/schemas'
import type { z } from 'zod'
import { AssistantChatAnswer } from '@/components/assistant/AssistantChatAnswer'

type Props = z.infer<typeof cornerTabSectionPropsSchema>

export function UiCornerTabSectionBlock({
  tabLabel,
  title,
  markdown,
  placement = 'top-right',
}: Props) {
  return (
    <Panel
      variant="default"
      data-plexon-assistant-ui
      className={`plexon-assistant-corner-tab is-${placement}`}
    >
      <div className="plexon-assistant-corner-tab-label">
        <Text role="label" as="span">
          {tabLabel}
        </Text>
      </div>
      <div className="plexon-assistant-corner-tab-body">
        {title ? (
          <Text role="title" as="h3" className="plexon-assistant-corner-tab-title">
            {title}
          </Text>
        ) : null}
        <AssistantChatAnswer answer={markdown} />
      </div>
    </Panel>
  )
}
