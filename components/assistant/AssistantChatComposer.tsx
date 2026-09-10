'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Chip, Field, IconSend, Spinner, Textarea } from '@msqdx/ui'
import { IconPaperclip } from '@/lib/msqdx-ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import {
  buildAssistantSuggestedPrompts,
  ASSISTANT_SUGGESTION_LABELS_DE,
  ASSISTANT_SUGGESTION_LABELS_EN,
} from '@/lib/assistant/suggested-prompts'
import {
  ASSISTANT_DOCUMENT_MAX_PER_TURN,
  ASSISTANT_DOCUMENT_UPLOAD_ACCEPT,
  ASSISTANT_IMAGE_MAX_PER_TURN,
} from '@/lib/constants'

export type AssistantPendingImage = { id: string; dataUrl: string }
export type AssistantPendingDocument = {
  id: string
  filename: string
  charCount: number
  truncated?: boolean
  usedOcr?: boolean
}

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
  pendingImages?: AssistantPendingImage[]
  pendingDocuments?: AssistantPendingDocument[]
  attachBusy?: boolean
  onAttachFiles?: (files: FileList | null) => void
  onRemoveImage?: (imageId: string) => void
  onRemoveDocument?: (documentId: string) => void
}

function filesFromDataTransfer(dt: DataTransfer | null): File[] {
  if (!dt) return []
  if (dt.files?.length) return Array.from(dt.files)
  const items = dt.items ? Array.from(dt.items) : []
  const out: File[] = []
  for (const item of items) {
    if (item.kind !== 'file') continue
    const file = item.getAsFile()
    if (file) out.push(file)
  }
  return out
}

function toFileList(files: File[]): FileList | null {
  if (!files.length) return null
  const dt = new DataTransfer()
  for (const file of files) dt.items.add(file)
  return dt.files
}

function looksLikeAttachableFile(file: File): boolean {
  const type = (file.type || '').toLowerCase()
  const name = (file.name || '').toLowerCase()
  if (type.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(name)) return true
  return /\.(docx|pdf|pptx|md|markdown|txt)$/i.test(name)
}

/**
 * DS chat composer — Field + Textarea.chat-composer + icon send + image/doc attach.
 * Spec: assistant-image-attachments.md · assistant-document-attachments.md
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
  pendingImages = [],
  pendingDocuments = [],
  attachBusy = false,
  onAttachFiles,
  onRemoveImage,
  onRemoveDocument,
}: AssistantChatComposerProps) {
  const router = useRouter()
  const { t, locale } = useI18n()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragDepthRef = useRef(0)
  const [dropActive, setDropActive] = useState(false)
  const hasPending = pendingImages.length > 0 || pendingDocuments.length > 0
  const sendDisabled = loading || attachBusy || (!value.trim() && !hasPending)
  const expanded = Boolean(value.trim()) || hasPending || dropActive
  const canAttachMore =
    pendingImages.length < ASSISTANT_IMAGE_MAX_PER_TURN ||
    pendingDocuments.length < ASSISTANT_DOCUMENT_MAX_PER_TURN
  const attachDisabled = loading || attachBusy || !canAttachMore
  const dropEnabled = Boolean(onAttachFiles) && !attachDisabled

  const labelFor = (key: string) => {
    const map = locale === 'de' ? ASSISTANT_SUGGESTION_LABELS_DE : ASSISTANT_SUGGESTION_LABELS_EN
    return map[key] ?? key
  }

  const suggestedPrompts = buildAssistantSuggestedPrompts({
    domain: targetUrl,
    projectName,
  })

  const ingestFiles = useCallback(
    (files: File[]) => {
      if (!onAttachFiles || !files.length || attachDisabled) return
      onAttachFiles(toFileList(files))
    },
    [attachDisabled, onAttachFiles],
  )

  const clearDropHighlight = () => {
    dragDepthRef.current = 0
    setDropActive(false)
  }

  return (
    <form
      className={[
        'chat-form',
        expanded ? 'is-expanded' : undefined,
        dropActive ? 'is-drop-active' : undefined,
      ]
        .filter(Boolean)
        .join(' ')}
      data-plexon-assistant-composer
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      onDragEnter={(e) => {
        if (!dropEnabled) return
        e.preventDefault()
        e.stopPropagation()
        dragDepthRef.current += 1
        if (e.dataTransfer?.types?.includes('Files')) setDropActive(true)
      }}
      onDragOver={(e) => {
        if (!dropEnabled) return
        e.preventDefault()
        e.stopPropagation()
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
      }}
      onDragLeave={(e) => {
        if (!dropEnabled) return
        e.preventDefault()
        e.stopPropagation()
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
        if (dragDepthRef.current === 0) setDropActive(false)
      }}
      onDrop={(e) => {
        if (!dropEnabled) return
        e.preventDefault()
        e.stopPropagation()
        clearDropHighlight()
        ingestFiles(filesFromDataTransfer(e.dataTransfer))
      }}
      onPaste={(e) => {
        if (!onAttachFiles || attachDisabled) return
        const files = filesFromDataTransfer(e.clipboardData).filter(looksLikeAttachableFile)
        if (!files.length) return
        // Attach screenshots / file items; leave pure text pastes alone.
        e.preventDefault()
        ingestFiles(files)
      }}
    >
      {dropActive ? (
        <div className="plexon-assistant-drop-hint" aria-hidden>
          {t('assistant.dropToAttach')}
        </div>
      ) : null}
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
      {onAttachFiles ? (
        <p className="plexon-assistant-attach-hint">{t('assistant.attachHint')}</p>
      ) : null}
      {pendingImages.length > 0 ? (
        <ul className="plexon-assistant-pending-attach" aria-label={t('assistant.pendingAttachmentsAria')}>
          {pendingImages.map((img) => (
            <li key={img.id} className="plexon-assistant-pending-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.dataUrl} alt="" />
              {onRemoveImage ? (
                <button
                  type="button"
                  className="plexon-assistant-pending-remove"
                  disabled={loading || attachBusy}
                  aria-label={t('assistant.removeAttachment')}
                  onClick={() => onRemoveImage(img.id)}
                >
                  ×
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {pendingDocuments.length > 0 ? (
        <ul className="plexon-assistant-pending-docs" aria-label={t('assistant.pendingDocumentsAria')}>
          {pendingDocuments.map((doc) => (
            <li key={doc.id} className="plexon-assistant-pending-doc">
              <span className="plexon-assistant-pending-doc-name" title={doc.filename}>
                {doc.filename}
              </span>
              {doc.usedOcr ? (
                <span className="plexon-assistant-pending-doc-ocr">{t('assistant.attachOcrBadge')}</span>
              ) : null}
              {onRemoveDocument ? (
                <button
                  type="button"
                  className="plexon-assistant-pending-remove"
                  disabled={loading || attachBusy}
                  aria-label={t('assistant.removeAttachment')}
                  onClick={() => onRemoveDocument(doc.id)}
                >
                  ×
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="plexon-assistant-composer-row">
        {onAttachFiles ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={`image/*,${ASSISTANT_DOCUMENT_UPLOAD_ACCEPT}`}
              multiple
              className="plexon-assistant-attach-input"
              disabled={attachDisabled}
              onChange={(e) => {
                onAttachFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="chat-attach chat-attach-icon"
              disabled={attachDisabled}
              aria-label={attachBusy ? t('assistant.attachFileBusy') : t('assistant.attachFile')}
              icon={attachBusy ? <Spinner size="sm" /> : <IconPaperclip />}
              onClick={() => fileInputRef.current?.click()}
            />
          </>
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
      </div>
    </form>
  )
}
