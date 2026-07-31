'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  Button,
  EmptyState,
  Field,
  Flyout,
  IconHistory,
  Input,
  SectionChrome,
  Spinner,
} from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import {
  conversationDisplayTitle,
  filterConversationsByQuery,
  formatConversationUpdatedAt,
  type AssistantConversationSummary,
} from '@/lib/assistant/conversation-history'

type AssistantConversationHistoryProps = {
  conversations: AssistantConversationSummary[]
  activeConversationId: string | null
  loading: boolean
  onSelect: (conversation: AssistantConversationSummary) => void
  onNewChat: () => void
  onRename: (id: string, title: string) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
}

function ConversationRow({
  conversation,
  selected,
  untitled,
  locale,
  onSelect,
  onRename,
  onDelete,
  onClose,
}: {
  conversation: AssistantConversationSummary
  selected: boolean
  untitled: string
  locale: string
  onSelect: () => void
  onRename: (id: string, title: string) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
  onClose: () => void
}) {
  const { t } = useI18n()
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [saving, setSaving] = useState(false)

  const displayTitle = conversationDisplayTitle(conversation.title, untitled)
  const updatedLabel = formatConversationUpdatedAt(conversation.updatedAt, locale)

  const saveTitle = useCallback(async () => {
    if (saving) return
    setSaving(true)
    try {
      const ok = await onRename(conversation.id, draftTitle.trim())
      if (ok) setEditing(false)
    } finally {
      setSaving(false)
    }
  }, [conversation.id, draftTitle, onRename, saving])

  const handleDelete = useCallback(async () => {
    if (!window.confirm(t('assistant.history.deleteConfirm'))) return
    await onDelete(conversation.id)
  }, [conversation.id, onDelete, t])

  if (editing) {
    return (
      <li className="plexon-chat-history-item is-editing">
        <Field label={t('assistant.history.rename')} htmlFor={`rename-${conversation.id}`}>
          <Input
            id={`rename-${conversation.id}`}
            value={draftTitle}
            disabled={saving}
            autoFocus
            onChange={(e) => setDraftTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void saveTitle()
              if (e.key === 'Escape') setEditing(false)
            }}
          />
        </Field>
        <div className="plexon-chat-history-item-actions">
          <Button size="sm" variant="primary" disabled={saving} onClick={() => void saveTitle()}>
            {t('assistant.history.renameSave')}
          </Button>
          <Button size="sm" variant="ghost" disabled={saving} onClick={() => setEditing(false)}>
            {t('assistant.history.renameCancel')}
          </Button>
        </div>
      </li>
    )
  }

  return (
    <li className={['plexon-chat-history-item', selected ? 'is-active' : ''].filter(Boolean).join(' ')}>
      <button
        type="button"
        className="plexon-chat-history-item-main"
        onClick={() => {
          onSelect()
          onClose()
        }}
      >
        <span className="plexon-chat-history-item-title">{displayTitle}</span>
        <span className="plexon-chat-history-item-meta">{updatedLabel}</span>
      </button>
      <div className="plexon-chat-history-item-actions">
        <Button
          size="sm"
          variant="ghost"
          aria-label={t('assistant.history.rename')}
          onClick={() => {
            setDraftTitle(conversation.title?.trim() ?? '')
            setEditing(true)
          }}
        >
          {t('assistant.history.rename')}
        </Button>
        <Button
          size="sm"
          variant="danger"
          aria-label={t('assistant.history.delete')}
          onClick={() => void handleDelete()}
        >
          {t('assistant.history.delete')}
        </Button>
      </div>
    </li>
  )
}

/** History flyout — Audion `Flyout` + `SectionChrome` (no MUI Drawer). */
export function AssistantConversationHistory({
  conversations,
  activeConversationId,
  loading,
  onSelect,
  onNewChat,
  onRename,
  onDelete,
}: AssistantConversationHistoryProps) {
  const { t, locale } = useI18n()
  const untitled = t('assistant.history.untitled')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredConversations = useMemo(
    () => filterConversationsByQuery(conversations, searchQuery, untitled),
    [conversations, searchQuery, untitled]
  )

  return (
    <Flyout
      label={t('assistant.history.open')}
      icon={<IconHistory />}
      resetKey={activeConversationId}
      triggerClassName="plexon-chat-topbar-icon"
      panelClassName="plexon-chat-history-flyover"
    >
      {({ close }) => (
        <>
          <SectionChrome
            quiet
            title={t('assistant.history.title')}
            meta={conversations.length ? `${conversations.length}` : undefined}
            as="h3"
          />
          <div className="plexon-chat-history-toolbar">
            <Field label={t('assistant.history.searchPlaceholder')} htmlFor="plexon-history-search">
              <Input
                id="plexon-history-search"
                value={searchQuery}
                placeholder={t('assistant.history.searchPlaceholder')}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Field>
            <Button
              size="sm"
              variant="subtle"
              onClick={() => {
                onNewChat()
                close()
              }}
            >
              {t('assistant.newConversation')}
            </Button>
          </div>

          {loading && conversations.length === 0 ? (
            <EmptyState className="plexon-chat-history-empty">
              <Spinner size="sm" /> {t('common.loading')}
            </EmptyState>
          ) : null}

          {!loading && conversations.length === 0 ? (
            <EmptyState className="plexon-chat-history-empty">{t('assistant.history.empty')}</EmptyState>
          ) : null}

          {!loading && conversations.length > 0 && filteredConversations.length === 0 ? (
            <EmptyState className="plexon-chat-history-empty">{t('assistant.history.noResults')}</EmptyState>
          ) : null}

          {filteredConversations.length > 0 ? (
            <ul className="plexon-chat-history-list">
              {filteredConversations.map((conversation) => (
                <ConversationRow
                  key={conversation.id}
                  conversation={conversation}
                  selected={conversation.id === activeConversationId}
                  untitled={untitled}
                  locale={locale}
                  onSelect={() => onSelect(conversation)}
                  onRename={onRename}
                  onDelete={onDelete}
                  onClose={close}
                />
              ))}
            </ul>
          ) : null}

        </>
      )}
    </Flyout>
  )
}
