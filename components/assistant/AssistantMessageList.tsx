'use client'

import type { UiBlock } from '@/lib/assistant/ui-blocks/types'
import { useI18n } from '@/components/i18n/I18nProvider'
import { ConfirmActionCard } from '@/components/assistant/ConfirmActionCard'
import { AssistantMessageContent } from '@/components/assistant/AssistantMessageContent'
import { AssistantMessageBlocks } from '@/components/assistant-ui/AssistantBlockRenderer'
import { AssistantChatBubble } from '@/components/assistant-ui/AssistantChatBubble'
import { PlannerStepCard, type PlannerMetadata } from '@/components/assistant/PlannerStepCard'
import { AssistantFollowUpChips } from '@/components/assistant/AssistantFollowUpChips'
import type { ConversationRecommendation } from '@/lib/assistant/insights/follow-up-suggestions'
import { applyConversationTargetToRecommendations } from '@/lib/assistant/project-target-url'
import { resolveConversationTargetUrl } from '@/lib/assistant/conversation-target-url'
import { messageUiBlocksForSurface } from '@/lib/assistant/ui-blocks/parse-metadata'

export type AssistantChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: Record<string, unknown> | null
}

type AssistantMessageListProps = {
  messages: AssistantChatMessage[]
  conversationId?: string | null
  /** overlay folds uiLayout.panel into the bubble; expand keeps panel separate */
  surface?: 'overlay' | 'expand'
  pinnedKeys?: Set<string>
  onPinToggle?: (messageId: string, block: UiBlock) => void
  onConfirmTool?: (pending: {
    toolUseId: string
    toolName: string
    input: Record<string, unknown>
  }) => void
  onFollowUp?: (prompt: string) => void
  followUpDisabled?: boolean
  projectDomain?: string | null
}

export function AssistantMessageList({
  messages,
  conversationId,
  surface = 'expand',
  pinnedKeys,
  onPinToggle,
  onConfirmTool,
  onFollowUp,
  followUpDisabled,
  projectDomain,
}: AssistantMessageListProps) {
  const { t } = useI18n()

  return (
    <>
      {messages.map((msg, index) => {
        const isUser = msg.role === 'user'
        const isStreaming = Boolean((msg.metadata as { streaming?: boolean } | undefined)?.streaming)
        const pending = msg.metadata?.pendingConfirmation as
          | { toolUseId: string; toolName: string; input: Record<string, unknown> }
          | undefined

        const planner = msg.metadata?.planner as PlannerMetadata | undefined
        const followUpPrompts = applyConversationTargetToRecommendations(
          (msg.metadata?.followUpPrompts as ConversationRecommendation[] | undefined) ?? [],
          resolveConversationTargetUrl({
            messages,
            projectDomain,
            throughIndex: index,
          })
        )
        const uiBlocks = messageUiBlocksForSurface(msg.metadata, surface)
        const hasText = msg.content.trim().length > 0
        const hasBubbleBody =
          hasText ||
          uiBlocks.length > 0 ||
          Boolean(planner?.intent) ||
          (followUpPrompts.length > 0 && !isUser)
        const senderLabel = isUser
          ? t('assistant.chat.you')
          : msg.role === 'assistant'
            ? t('assistant.chat.assistant')
            : t('assistant.chat.system')

        return (
          <div key={msg.id} className="plexon-assistant-turn-wrap">
            {hasBubbleBody ? (
              <AssistantChatBubble
                role={msg.role}
                senderLabel={senderLabel}
                status={isStreaming && !isUser ? 'sending' : undefined}
              >
                <div className="plexon-assistant-turn-body">
                  {hasText ? (
                    <AssistantMessageContent
                      role={msg.role}
                      content={msg.content}
                      contentType={
                        typeof msg.metadata?.contentType === 'string'
                          ? msg.metadata.contentType
                          : null
                      }
                    />
                  ) : null}
                  {uiBlocks.length > 0 ? (
                    <AssistantMessageBlocks
                      blocks={uiBlocks}
                      messageId={!isUser && conversationId ? msg.id : undefined}
                      streaming={isStreaming}
                      pinnedKeys={pinnedKeys}
                      onPinToggle={!isUser ? onPinToggle : undefined}
                    />
                  ) : null}
                  {planner?.intent ? <PlannerStepCard planner={planner} /> : null}
                  {followUpPrompts.length > 0 && onFollowUp ? (
                    <AssistantFollowUpChips
                      prompts={followUpPrompts}
                      disabled={followUpDisabled}
                      onSelect={onFollowUp}
                    />
                  ) : null}
                </div>
              </AssistantChatBubble>
            ) : null}
            {pending && onConfirmTool ? (
              <div className="plexon-assistant-confirm">
                <ConfirmActionCard
                  pending={pending}
                  onConfirm={() => onConfirmTool(pending)}
                  onCancel={() => {}}
                />
              </div>
            ) : null}
          </div>
        )
      })}
    </>
  )
}
