'use client'

import { Chip, Text } from '@msqdx/ui'
import type { ConversationRecommendation } from '@/lib/assistant/insights/follow-up-suggestions'

type AssistantFollowUpChipsProps = {
  prompts: ConversationRecommendation[]
  disabled?: boolean
  onSelect: (prompt: string) => void
}

/** Auto-recommendations to continue the conversation — one click sends the prompt. */
export function AssistantFollowUpChips({
  prompts,
  disabled,
  onSelect,
}: AssistantFollowUpChipsProps) {
  if (!prompts.length) return null

  return (
    <div className="plexon-assistant-followups">
      <Text role="label" as="span" className="plexon-assistant-followups-label">
        Als Nächstes empfohlen
      </Text>
      <div className="plexon-assistant-followups-list" role="list">
        {prompts.map((item) => (
          <Chip
            key={item.id}
            size="sm"
            disabled={disabled}
            title={item.reason || undefined}
            onClick={() => onSelect(item.prompt)}
          >
            {item.label}
          </Chip>
        ))}
      </div>
    </div>
  )
}
