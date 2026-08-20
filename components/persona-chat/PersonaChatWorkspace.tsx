'use client'

import './persona-chat.css'

import { useCallback, useEffect, useState } from 'react'
import type { ChatModality, ChatSharePersona, ChatTavusSessionResponse, PersonaSummary } from '@audion-v3/contracts'
import { Alert, Button, IconMic, IconVideo, LoadingText, Text } from '@msqdx/ui'
import { apiAudionSharePersona, API_AUDION_CHAT_TAVUS_SESSION } from '@/lib/paths/audion-chat-api'
import { PersonaChatPanel } from './PersonaChatPanel'
import { TavusVideoPanel } from './TavusVideoPanel'

export type PersonaChatWorkspaceProps = {
  personaId: string
  projectId: string
  personaName?: string | null
  /** Public share → text-only guest; logged-in EQC → Tavus + inspect. */
  guestMode?: boolean
}

function iconBtnClass(active?: boolean): string {
  return ['chat-send', 'chat-send-icon', 'plexon-persona-chat-modality-btn', active ? 'is-active' : undefined]
    .filter(Boolean)
    .join(' ')
}

export function PersonaChatWorkspace({
  personaId,
  projectId,
  personaName,
  guestMode = true,
}: PersonaChatWorkspaceProps) {
  const fullCapabilities = !guestMode
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [persona, setPersona] = useState<PersonaSummary | null>(null)
  const [busy, setBusy] = useState(false)
  const [modality, setModality] = useState<ChatModality>('text')
  const [tavusSession, setTavusSession] = useState<{
    conversationUrl: string
    conversationId: string | null
    meetingToken: string | null
  } | null>(null)
  const [tavusError, setTavusError] = useState<string | null>(null)
  const [tavusBusy, setTavusBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const res = await fetch(apiAudionSharePersona(personaId, projectId), {
          credentials: 'same-origin',
        })
        const data = (await res.json().catch(() => null)) as (ChatSharePersona & { error?: string }) | null
        if (!res.ok) throw new Error(data?.error || `Persona load failed (${res.status})`)
        if (!data?.id) throw new Error('Persona not found')
        if (!cancelled) {
          setPersona({
            id: data.id,
            name: data.name,
            role: data.role,
            projectId: data.projectId,
            status: 'ready',
            archetype: null,
            updatedAt: null,
            avatarUrl: data.avatarUrl,
          })
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Failed to load persona')
          setPersona(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [personaId, projectId])

  const toggleModality = useCallback((next: ChatModality) => {
    setModality((prev) => (prev === next ? 'text' : next))
  }, [])

  useEffect(() => {
    if (!fullCapabilities || modality !== 'video' || !personaId.trim()) {
      setTavusSession(null)
      return
    }
    let cancelled = false
    async function start() {
      setTavusBusy(true)
      setTavusError(null)
      try {
        const res = await fetch(API_AUDION_CHAT_TAVUS_SESSION, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ personaId }),
        })
        const data = (await res.json().catch(() => null)) as
          | (ChatTavusSessionResponse & { error?: string; code?: string })
          | null
        if (!res.ok) throw new Error(data?.error || 'Tavus session failed')
        if (!data?.conversationUrl) throw new Error('Tavus returned no conversation URL')
        if (!cancelled) {
          setTavusSession({
            conversationUrl: data.conversationUrl,
            conversationId: data.conversationId ?? null,
            meetingToken: data.meetingToken,
          })
        }
      } catch (e) {
        if (!cancelled) {
          setTavusSession(null)
          setTavusError(e instanceof Error ? e.message : 'Tavus failed')
        }
      } finally {
        if (!cancelled) setTavusBusy(false)
      }
    }
    void start()
    return () => {
      cancelled = true
    }
  }, [modality, personaId, fullCapabilities])

  const composerLeading =
    fullCapabilities ? (
      <div className="plexon-persona-chat-composer-actions" role="toolbar" aria-label="Chat modality">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={iconBtnClass(modality === 'voice')}
          icon={<IconMic />}
          aria-label="Voice"
          aria-pressed={modality === 'voice'}
          disabled={busy}
          onClick={() => toggleModality('voice')}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={iconBtnClass(modality === 'video')}
          icon={<IconVideo />}
          aria-label={tavusBusy ? 'Starting video…' : 'Video'}
          aria-pressed={modality === 'video'}
          disabled={busy || tavusBusy}
          onClick={() => toggleModality('video')}
        />
      </div>
    ) : null

  if (loading) {
    return (
      <div className="plexon-persona-chat-workspace" data-testid="persona-chat-loading">
        <LoadingText>Loading persona…</LoadingText>
      </div>
    )
  }

  if (loadError || !persona) {
    return (
      <div className="plexon-persona-chat-workspace" data-testid="persona-chat-error">
        <Alert tone="error">{loadError || 'Persona not found'}</Alert>
      </div>
    )
  }

  const displayName = personaName?.trim() || persona.name

  return (
    <div
      className="plexon-persona-chat-workspace"
      data-testid="persona-chat-workspace"
      data-guest-mode={guestMode ? '1' : '0'}
    >
      <div className="plexon-persona-chat-topbar">
        <Text role="label">{displayName}</Text>
        <span className="plexon-persona-chat-badge">
          {fullCapabilities ? 'Persona chat' : 'Guest chat'}
        </span>
      </div>

      {fullCapabilities && modality === 'voice' ? (
        <p className="plexon-persona-chat-modality-note" role="status">
          Voice mode stub — mic UI deferred. Text chat still works below.
        </p>
      ) : null}

      {fullCapabilities && modality === 'video' ? (
        <div className="plexon-persona-chat-tavus" role="region" aria-label="Tavus video">
          {tavusBusy ? <p>Starting video session…</p> : null}
          {tavusError ? <Alert tone="error">{tavusError}</Alert> : null}
          {tavusSession ? <TavusVideoPanel session={tavusSession} personaName={displayName} /> : null}
        </div>
      ) : null}

      <PersonaChatPanel
        persona={persona}
        projectId={projectId}
        fullCapabilities={fullCapabilities}
        guestMode={guestMode}
        composerLeading={composerLeading}
      />
    </div>
  )
}
