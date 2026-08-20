'use client'

/**
 * EQC persona chat host — native ChatOverlay + Audion API via Plexon BFF.
 * Spec: knowledge/eqc-persona-chat.md · audion-v3/specs/domain/chat-embed.md
 */

import { useMemo } from 'react'
import { Button, ChatOverlay } from '@msqdx/ui'
import { resolveEqcPersonaChatHref } from '@/lib/assistant/event-quick-check/eqc-persona-chat-href'
import { EQC_REPORT_COPY } from '@/lib/assistant/reports/event-quick-check-report-copy'
import { PersonaChatWorkspace } from '@/components/persona-chat/PersonaChatWorkspace'

export type EqcPersonaChatOverlayProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  personaId?: string | null
  personaName?: string | null
  audionProjectId?: string | null
  /** Public share → guest text-only; logged-in EQC → full chat incl. Tavus. */
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
  const pid = personaId?.trim() ?? ''
  const projectId = audionProjectId?.trim() ?? ''

  const fullHref = useMemo(
    () =>
      resolveEqcPersonaChatHref({
        personaId: pid,
        audionProjectId: projectId,
      }),
    [pid, projectId],
  )

  const title = personaName?.trim()
    ? `${EQC_REPORT_COPY.personaChatCta}: ${personaName.trim()}`
    : EQC_REPORT_COPY.personaChatCta

  if (!pid || !projectId) return null

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
      {open ? (
        <PersonaChatWorkspace
          personaId={pid}
          projectId={projectId}
          personaName={personaName}
          guestMode={guestEmbed}
        />
      ) : null}
    </ChatOverlay>
  )
}
