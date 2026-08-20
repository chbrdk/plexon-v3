'use client'

import React, { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type {
  ChatMessage,
  ChatStreamEvent,
  ChatToolCompleteEvent,
  ChatToolProposedEvent,
  PersonaSummary,
} from '@audion-v3/contracts'
import {
  Alert,
  Button,
  EmptyState,
  EventFooter,
  Field,
  InspectDock,
  LoadingText,
  Textarea,
  IconSend,
} from '@msqdx/ui'
import { apiAudionChatToolDecision } from '@/lib/paths/audion-chat-api'
import {
  GUEST_CHAT_MAX_CHARS,
  GUEST_CHAT_MAX_USER_TURNS,
  resolveClientGuestSessionId,
  storeGuestSessionId,
} from '@/lib/persona-chat/guest-session'
import { postPersonaChatStream } from '@/lib/persona-chat/stream-client'
import { PersonaChatAnswer } from './PersonaChatAnswer'

type Props = {
  persona: PersonaSummary
  projectId: string
  fullCapabilities?: boolean
  guestMode?: boolean
  composerLeading?: React.ReactNode
}

function ChatTurnArticle({ turn }: { turn: ChatMessage }) {
  return (
    <article
      className={turn.role === 'user' ? 'chat-turn chat-turn-user' : 'chat-turn chat-turn-assistant'}
    >
      <span className="chat-role">{turn.role === 'user' ? 'You' : 'Persona'}</span>
      {turn.role === 'assistant' ? (
        turn.content ? (
          <PersonaChatAnswer answer={turn.content} />
        ) : (
          <LoadingText>Thinking…</LoadingText>
        )
      ) : (
        <p className="chat-text">{turn.content}</p>
      )}
    </article>
  )
}

export function PersonaChatPanel({
  persona,
  projectId,
  fullCapabilities = false,
  guestMode = true,
  composerLeading = null,
}: Props) {
  const personaId = persona.id
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [turns, setTurns] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [composerError, setComposerError] = useState<string | null>(null)
  const [guestSessionId, setGuestSessionId] = useState<string | null>(() =>
    guestMode ? resolveClientGuestSessionId(personaId, projectId) : null,
  )
  const [guestRemaining, setGuestRemaining] = useState<number | null>(
    guestMode ? GUEST_CHAT_MAX_USER_TURNS : null,
  )
  const [pendingTool, setPendingTool] = useState<ChatToolProposedEvent | null>(null)
  const [toolBusy, setToolBusy] = useState(false)
  const [toolProgress, setToolProgress] = useState<string[]>([])
  const [toolComplete, setToolComplete] = useState<ChatToolCompleteEvent | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const turnsRef = useRef(turns)
  turnsRef.current = turns

  const guestBudget = guestMode
    ? {
        sessionId: guestSessionId ?? resolveClientGuestSessionId(personaId, projectId),
        remainingTurns: guestRemaining ?? GUEST_CHAT_MAX_USER_TURNS,
        maxTurns: GUEST_CHAT_MAX_USER_TURNS,
        maxChars: GUEST_CHAT_MAX_CHARS,
      }
    : null

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [turns, busy, pendingTool, toolProgress, toolComplete])

  useEffect(() => () => abortRef.current?.abort(), [])

  function handleStreamEvent(streamingId: string, event: ChatStreamEvent) {
    if (event.type === 'delta') {
      setTurns((prev) =>
        prev.map((t) =>
          t.id === streamingId
            ? { ...t, content: `${t.content}${event.text}`, status: 'streaming' }
            : t,
        ),
      )
    } else if (event.type === 'done') {
      setConversationId(event.conversationId)
      setTurns((prev) =>
        prev.map((t) =>
          t.id === streamingId
            ? {
                ...t,
                id: event.messageId || t.id,
                status: 'complete',
                createdAt: new Date().toISOString(),
              }
            : t,
        ),
      )
    } else if (event.type === 'error') {
      setErr(event.message)
      setTurns((prev) =>
        prev.map((t) =>
          t.id === streamingId ? { ...t, status: 'error', content: t.content || event.message } : t,
        ),
      )
    } else if (event.type === 'tool_proposed') {
      if (!fullCapabilities) return
      setPendingTool(event)
      setToolComplete(null)
      setToolProgress([])
    } else if (event.type === 'tool_started' || event.type === 'tool_progress') {
      if (!fullCapabilities) return
      setToolProgress((prev) => [...prev, event.message])
    } else if (event.type === 'tool_complete') {
      if (!fullCapabilities) return
      setPendingTool(null)
      setToolComplete(event)
    } else if (event.type === 'tool_denied') {
      if (!fullCapabilities) return
      setPendingTool(null)
      setToolProgress([])
      setToolComplete(null)
    }
  }

  async function sendMessage(raw: string) {
    const message = raw.trim()
    if (!message) {
      setComposerError('Message is required')
      return
    }
    if (guestBudget && guestRemaining != null && guestRemaining <= 0) {
      setComposerError(
        `Guest chat limit reached (${guestBudget.maxTurns} messages). Open in Audion for a full session.`,
      )
      return
    }
    if (guestBudget && message.length > guestBudget.maxChars) {
      setComposerError(`Message is too long (max ${guestBudget.maxChars} characters).`)
      return
    }

    setComposerError(null)
    setErr(null)
    setDraft('')
    setBusy(true)
    setPendingTool(null)

    const userTurn: ChatMessage = {
      id: `local-user-${Date.now()}`,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
      status: 'complete',
    }
    const streamingId = `local-asst-${Date.now()}`
    setTurns((prev) => [
      ...prev,
      userTurn,
      { id: streamingId, role: 'assistant', content: '', createdAt: null, status: 'streaming' },
    ])

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const sessionId = guestBudget
      ? guestSessionId ?? resolveClientGuestSessionId(personaId, projectId)
      : null

    try {
      const result = await postPersonaChatStream(
        {
          personaId,
          message,
          conversationId,
          projectId,
          guestSessionId: sessionId,
        },
        (event) => handleStreamEvent(streamingId, event),
        controller.signal,
      )
      if (result.guestSessionId && guestMode) {
        setGuestSessionId(result.guestSessionId)
        storeGuestSessionId(personaId, projectId, result.guestSessionId)
      }
      if (result.guestRemaining != null && guestMode) {
        setGuestRemaining(result.guestRemaining)
      } else if (guestRemaining != null && guestMode) {
        setGuestRemaining((n) => (n == null ? n : Math.max(0, n - 1)))
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
      setErr(error instanceof Error ? error.message : 'Stream failed')
    } finally {
      setBusy(false)
    }
  }

  async function decideTool(decision: 'approve' | 'deny') {
    if (!pendingTool || !fullCapabilities) return
    setToolBusy(true)
    setErr(null)
    try {
      const res = await fetch(apiAudionChatToolDecision(pendingTool.callId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' },
        credentials: 'same-origin',
        body: JSON.stringify({
          decision,
          conversationId,
          personaId,
          projectId,
          agentTask: pendingTool.agentTask ?? null,
        }),
      })
      if (!res.ok || !res.body) {
        const errBody = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(errBody?.error || `Decision failed (${res.status})`)
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          handleStreamEvent('', JSON.parse(trimmed) as ChatStreamEvent)
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Tool decision failed')
    } finally {
      setToolBusy(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void sendMessage(draft)
  }

  function onComposerKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.shiftKey) return
    e.preventDefault()
    void sendMessage(draft)
  }

  function onStop() {
    abortRef.current?.abort()
    setBusy(false)
  }

  const showInspectDock = fullCapabilities && Boolean(toolComplete || toolProgress.length)

  return (
    <section
      className="chat-panel chat-panel-open chat-panel-compact plexon-persona-chat-panel"
      aria-label="Persona chat"
      data-testid="persona-chat-panel"
    >
      <div className="chat-turns" ref={listRef}>
        {!turns.length && !busy ? (
          <EmptyState className="chat-empty">
            Ask {persona.name || 'the persona'} something grounded in their magazine brief.
          </EmptyState>
        ) : null}
        {turns.map((turn) => (
          <ChatTurnArticle key={turn.id} turn={turn} />
        ))}

        {fullCapabilities && pendingTool ? (
          <div className="plexon-persona-chat-tool-card" role="group" aria-label="Tool approval">
            <p className="plexon-persona-chat-tool-title">{pendingTool.title}</p>
            <p>{pendingTool.detail}</p>
            {pendingTool.url ? (
              <p>
                <code>{pendingTool.url}</code>
              </p>
            ) : null}
            <div className="plexon-persona-chat-tool-actions">
              <Button
                type="button"
                size="sm"
                disabled={toolBusy}
                onClick={() => void decideTool('approve')}
              >
                {toolBusy ? 'Working…' : 'Approve'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={toolBusy}
                onClick={() => void decideTool('deny')}
              >
                Deny
              </Button>
            </div>
          </div>
        ) : null}

        {fullCapabilities && toolProgress.length ? (
          <ul className="plexon-persona-chat-tool-progress">
            {toolProgress.slice(-6).map((line, i) => (
              <li key={`${i}-${line}`}>{line}</li>
            ))}
          </ul>
        ) : null}

        {showInspectDock && toolComplete ? (
          <InspectDock aria-label="UX journey inspect">
            <EventFooter summary={toolComplete.summary}>
              {toolComplete.videoUrl ? (
                <a className="plexon-link" href={toolComplete.videoUrl} target="_blank" rel="noreferrer">
                  Open recording
                </a>
              ) : null}
            </EventFooter>
          </InspectDock>
        ) : null}

        {busy ? <LoadingText>Streaming…</LoadingText> : null}
      </div>

      {err ? <Alert tone="error">{err}</Alert> : null}

      <form
        className={['chat-form', draft.trim() ? 'is-expanded' : undefined].filter(Boolean).join(' ')}
        onSubmit={onSubmit}
      >
        {composerLeading}
        {guestBudget ? (
          <p className="plexon-persona-chat-guest-hint" role="status" data-testid="guest-budget-hint">
            {guestRemaining != null && guestRemaining <= 0
              ? `Guest limit reached (${guestBudget.maxTurns} messages).`
              : `${guestRemaining ?? guestBudget.remainingTurns} of ${guestBudget.maxTurns} guest messages left`}
          </p>
        ) : null}
        <Field label="Message" error={composerError ?? undefined} htmlFor="persona-chat-composer">
          <Textarea
            id="persona-chat-composer"
            size="md"
            block
            rows={1}
            className="chat-composer"
            value={draft}
            maxLength={guestBudget?.maxChars}
            onChange={(ev) => {
              setDraft(ev.target.value)
              if (composerError) setComposerError(null)
            }}
            onKeyDown={onComposerKeyDown}
            placeholder={
              fullCapabilities
                ? 'Ask about goals, channels, or paste a URL to inspect…'
                : 'Ask the persona about their brief…'
            }
            disabled={busy || toolBusy || (guestRemaining != null && guestRemaining <= 0)}
            autoComplete="off"
            aria-label="Chat message"
          />
        </Field>
        {busy ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="chat-send"
            aria-label="Stop"
            onClick={onStop}
          >
            Stop
          </Button>
        ) : (
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="chat-send chat-send-icon"
            icon={<IconSend />}
            disabled={
              draft.trim().length < 1 ||
              toolBusy ||
              (guestRemaining != null && guestRemaining <= 0)
            }
            aria-label="Send"
          />
        )}
      </form>
    </section>
  )
}
