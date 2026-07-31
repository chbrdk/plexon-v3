'use client'

import { Text } from '@msqdx/ui'
import { ASSISTANT_MESSAGE_CONTENT_TYPE } from '@/lib/assistant/capabilities-overview'
import { AssistantCapabilitiesOverview } from '@/components/assistant/AssistantCapabilitiesOverview'

type AssistantMessageContentProps = {
  role: 'user' | 'assistant' | 'system'
  content: string
  contentType?: string | null
}

/** Message body — plain text for user; markdown-ish pre-wrap for assistant (bridge Markdown was identity). */
export function AssistantMessageContent({ role, content, contentType }: AssistantMessageContentProps) {
  const isUser = role === 'user'

  if (isUser) {
    return (
      <Text role="body" as="p" className="plexon-assistant-user-text">
        {content}
      </Text>
    )
  }

  if (contentType === ASSISTANT_MESSAGE_CONTENT_TYPE.CAPABILITIES_OVERVIEW) {
    return <AssistantCapabilitiesOverview />
  }

  return (
    <div className="plexon-assistant-markdown">
      {content}
    </div>
  )
}
