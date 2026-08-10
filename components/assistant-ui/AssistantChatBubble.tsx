'use client'

import type { ReactNode } from 'react'

type AssistantChatBubbleProps = {
  role: 'user' | 'assistant' | 'system'
  senderLabel?: string
  children: ReactNode
  status?: 'sending'
}

/** DS chat turn — Audion `.chat-turn` / `.chat-role` (no glass bubble chrome). */
export function AssistantChatBubble({
  role,
  senderLabel,
  children,
  status,
}: AssistantChatBubbleProps) {
  const turnClass =
    role === 'user' ? 'chat-turn chat-turn-user' : 'chat-turn chat-turn-assistant'

  return (
    <article className={turnClass} data-role={role} data-status={status}>
      {senderLabel ? <span className="chat-role">{senderLabel}</span> : null}
      <div className={role === 'user' ? 'chat-text' : 'plexon-assistant-bubble-body'}>{children}</div>
      {status === 'sending' ? <span className="chat-turn-status" aria-hidden>…</span> : null}
    </article>
  )
}
