'use client'

import { useEffect, useRef } from 'react'
import { Text } from '@msqdx/ui'
import { tavusEmbedUrl } from '@/lib/persona-chat/tavus-embed-url'
import { API_AUDION_CHAT_TAVUS_SESSION } from '@/lib/paths/audion-chat-api'

export type TavusSessionConfig = {
  conversationUrl?: string | null
  conversationId?: string | null
  meetingToken?: string | null
}

type Props = {
  session: TavusSessionConfig
  personaName?: string | null
}

export function TavusVideoPanel({ session, personaName }: Props) {
  const url = session.conversationUrl?.trim()
  const conversationId = session.conversationId?.trim() || null

  useEffect(() => {
    if (!conversationId) return
    return () => {
      void fetch(API_AUDION_CHAT_TAVUS_SESSION, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
        keepalive: true,
        credentials: 'same-origin',
      })
    }
  }, [conversationId])

  if (!url) {
    return (
      <div className="plexon-tavus-video-panel plexon-tavus-video-panel--empty" role="status">
        <Text role="body">No conversation URL from Tavus.</Text>
      </div>
    )
  }

  const embedUrl = tavusEmbedUrl(url, session.meetingToken)
  const title = personaName ? `Tavus video: ${personaName}` : 'Tavus video call'

  return (
    <div className="plexon-tavus-video-panel">
      {personaName ? (
        <p className="plexon-tavus-video-caption">Video call with {personaName}</p>
      ) : null}
      <iframe
        src={embedUrl}
        title={title}
        allow="camera; microphone; fullscreen; display-capture"
        data-testid="persona-chat-tavus-iframe"
      />
    </div>
  )
}
