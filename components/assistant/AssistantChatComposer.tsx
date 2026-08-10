'use client'

import { useRouter } from 'next/navigation'
import { Button, Chip, Field, IconSend, Spinner, Textarea } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import {
  buildAssistantSuggestedPrompts,
  ASSISTANT_SUGGESTION_LABELS_DE,
  ASSISTANT_SUGGESTION_LABELS_EN,
} from '@/lib/assistant/suggested-prompts'

type AssistantChatComposerProps = {
  value: string
  loading: boolean
  onChange: (value: string) => void
  onSubmit: () => void
  onSuggestion?: (prompt: string) => void
  targetUrl?: string | null
  projectName?: string | null
  /** Hide capability chip cloud (overlay flyout). */
  compact?: boolean
}

/**
 * DS chat composer — Field + Textarea.chat-composer + icon send.
 * Spec: @msqdx/ui chat chrome · Audion chat-panel pattern.
 */
export function AssistantChatComposer({
  value,
  loading,
  onChange,
  onSubmit,
  onSuggestion,
  targetUrl,
  projectName,
  compact = false,
}: AssistantChatComposerProps) {
  const router = useRouter()
  const { t, locale } = useI18n()
  const sendDisabled = loading || !value.trim()
  const expanded = Boolean(value.trim())

  const labelFor = (key: string) => {
    const map = locale === 'de' ? ASSISTANT_SUGGESTION_LABELS_DE : ASSISTANT_SUGGESTION_LABELS_EN
    return map[key] ?? key
  }

  const suggestedPrompts = buildAssistantSuggestedPrompts({
    domain: targetUrl,
    projectName,
  })

  return (
    <form
      className={['chat-form', expanded ? 'is-expanded' : undefined].filter(Boolean).join(' ')}
      data-plexon-assistant-composer
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      {!compact && onSuggestion ? (
        <div className="plexon-assistant-suggestions" role="list">
          {suggestedPrompts.map((s) => (
            <Chip
              key={s.id}
              size="sm"
              disabled={loading}
              onClick={() => {
                if (s.hrefPath) {
                  router.push(s.hrefPath)
                  return
                }
                onSuggestion?.(s.prompt)
              }}
            >
              {labelFor(s.labelKey)}
            </Chip>
          ))}
        </div>
      ) : null}
      <Field label={t('assistant.messageLabel')} htmlFor="plexon-chat-composer" size="md">
        <Textarea
          id="plexon-chat-composer"
          size="md"
          block
          rows={1}
          className="chat-composer"
          placeholder={t('assistant.placeholder')}
          value={value}
          disabled={loading}
          autoComplete="off"
          aria-label={t('assistant.placeholder')}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              if (!sendDisabled) onSubmit()
            }
          }}
        />
      </Field>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="chat-send chat-send-icon"
        disabled={sendDisabled}
        aria-label={t('assistant.send')}
        icon={loading ? <Spinner size="sm" /> : <IconSend />}
      />
    </form>
  )
}
