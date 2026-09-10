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
import {
  ASSISTANT_DOCUMENT_ATTACHMENT_PLACEHOLDER,
  ASSISTANT_IMAGE_ATTACHMENT_PLACEHOLDER,
} from '@/lib/constants'

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
        const messageImages = Array.isArray(
          (msg.metadata as { images?: unknown } | undefined)?.images,
        )
          ? (
              (msg.metadata as { images: { id: string; dataUrl: string }[] }).images ?? []
            ).filter((img) => img?.id && img?.dataUrl)
          : []
        const messageDocuments = Array.isArray(
          (msg.metadata as { documents?: unknown } | undefined)?.documents,
        )
          ? (
              (msg.metadata as {
                documents: { id: string; filename: string; charCount?: number }[]
              }).documents ?? []
            ).filter((doc) => doc?.id && doc?.filename)
          : []
        const isAttachmentPlaceholder =
          msg.content.trim() === ASSISTANT_IMAGE_ATTACHMENT_PLACEHOLDER ||
          msg.content.trim() === ASSISTANT_DOCUMENT_ATTACHMENT_PLACEHOLDER
        const hasText =
          msg.content.trim().length > 0 &&
          !(isAttachmentPlaceholder && (messageImages.length > 0 || messageDocuments.length > 0))
        const hasBubbleBody =
          hasText ||
          messageImages.length > 0 ||
          messageDocuments.length > 0 ||
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
                  {messageImages.length > 0 ? (
                    <ul className="plexon-assistant-attach-thumbs" aria-label={t('assistant.pendingAttachmentsAria')}>
                      {messageImages.map((img) => (
                        <li key={img.id} className="plexon-assistant-attach-thumb">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.dataUrl} alt="" />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {messageDocuments.length > 0 ? (
                    <ul className="plexon-assistant-attach-docs" aria-label={t('assistant.pendingDocumentsAria')}>
                      {messageDocuments.map((doc) => (
                        <li key={doc.id} className="plexon-assistant-attach-doc">
                          <span className="plexon-assistant-attach-doc-name" title={doc.filename}>
                            {doc.filename}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
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
