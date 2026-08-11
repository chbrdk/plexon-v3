'use client'

/**
 * EQC persona chat host — ChatOverlay + Audion /chat/embed iframe.
 * Spec: knowledge/eqc-persona-chat.md · audion-v3/specs/domain/chat-embed.md
 */

import { useEffect, useMemo, useState } from 'react'
import { Button, ChatOverlay } from '@msqdx/ui'
import {
  resolveEqcPersonaChatEmbedHref,
  resolveEqcPersonaChatHref,
} from '@/lib/assistant/event-quick-check/eqc-persona-chat-href'
import { readDocumentThemeId } from '@/lib/assistant/embed-theme'
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy'

export type EqcPersonaChatOverlayProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  personaId?: string | null
  personaName?: string | null
  audionProjectId?: string | null
}

export function EqcPersonaChatOverlay({
  open,
  onOpenChange,
  personaId,
  personaName,
  audionProjectId,
}: EqcPersonaChatOverlayProps) {
  const [themeId, setThemeId] = useState<string | null>(null)

  useEffect(() => {
    const sync = () => setThemeId(readDocumentThemeId())
    sync()
    const root = document.documentElement
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  const embedHref = useMemo(
    () =>
      resolveEqcPersonaChatEmbedHref({
        personaId,
        audionProjectId,
        theme: themeId,
      }),
    [personaId, audionProjectId, themeId],
  )

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
        title={title}
        src={open ? embedHref : undefined}
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
        allow="clipboard-write"
      />
    </ChatOverlay>
  )
}
