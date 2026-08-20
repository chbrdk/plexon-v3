'use client'

/**
 * EQC persona chat host — ChatOverlay + Audion /chat/embed iframe.
 * Spec: knowledge/eqc-persona-chat.md · audion-v3/specs/domain/chat-embed.md
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, ChatOverlay } from '@msqdx/ui'
import {
  resolveEqcPersonaChatEmbedHref,
  resolveEqcPersonaChatHref,
} from '@/lib/assistant/event-quick-check/eqc-persona-chat-href'
import { postAssistantHostMessage } from '@/lib/assistant/embed-protocol'
import { readDocumentThemeId } from '@/lib/assistant/embed-theme'
import { getAudionWebOrigin } from '@/lib/constants'
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy'

export type EqcPersonaChatOverlayProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  personaId?: string | null
  personaName?: string | null
  audionProjectId?: string | null
  /** Public share → guest embed; logged-in EQC → full chat incl. Tavus. */
  guestEmbed?: boolean
}

export function EqcPersonaChatOverlay({
  open,
  onOpenChange,
  personaId,
  personaName,
  audionProjectId,
  guestEmbed = false,
}: EqcPersonaChatOverlayProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [themeId, setThemeId] = useState<string | null>(() =>
    typeof document !== 'undefined' ? readDocumentThemeId() : null,
  )

  const audionOrigin = useMemo(() => {
    try {
      return new URL(getAudionWebOrigin()).origin
    } catch {
      return ''
    }
  }, [])

  useEffect(() => {
    const sync = () => setThemeId(readDocumentThemeId())
    sync()
    const root = document.documentElement
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  const postThemeToEmbed = () => {
    if (!themeId || !audionOrigin) return
    const frame = iframeRef.current?.contentWindow
    if (!frame) return
    postAssistantHostMessage(frame, audionOrigin, {
      type: 'assistant:theme',
      themeId,
    })
  }

  const embedHref = useMemo(
    () =>
      resolveEqcPersonaChatEmbedHref({
        personaId,
        audionProjectId,
        theme: themeId,
        full: !guestEmbed,
      }),
    [personaId, audionProjectId, themeId, guestEmbed],
  )

  useEffect(() => {
    if (!open) return
    postThemeToEmbed()
  }, [open, themeId, audionOrigin])

  const fullHref = useMemo(
    () =>
      resolveEqcPersonaChatHref({
        personaId,
        audionProjectId,
      }),
    [personaId, audionProjectId],
  )

  const title = personaName?.trim()
    ? `${EQC_REPORT_COPY.personaChatCta}: ${personaName.trim()}`
    : EQC_REPORT_COPY.personaChatCta

  if (!embedHref) return null

  return (
    <ChatOverlay
      open={open}
      onOpenChange={onOpenChange}
      placement="dock-end"
      title={title}
      ariaLabel={title}
      headerActions={
        fullHref ? (
          <Button
            variant="ghost"
            size="sm"
            href={fullHref}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="eqc-persona-chat-open-audion"
          >
            {EQC_REPORT_COPY.personaChatOpenAudion}
          </Button>
        ) : null
      }
    >
      <iframe
        ref={iframeRef}
        title={title}
        src={open ? embedHref : undefined}
        onLoad={postThemeToEmbed}
        className="plexon-eqc-persona-chat-iframe"
        data-testid="eqc-persona-chat-iframe"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '28rem',
          border: 0,
          display: 'block',
          background: 'transparent',
        }}
        allow="camera; microphone; fullscreen; display-capture; clipboard-write"
      />
    </ChatOverlay>
  )
}
