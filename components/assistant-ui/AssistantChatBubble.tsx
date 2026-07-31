'use client'

import type { CSSProperties, ReactNode } from 'react'
import { Box, Stack } from '@/components/ui/layout'
import { MsqdxIcon } from '@msqdx/react'
import {
  getGlassChatBubbleAlign,
  getGlassChatBubbleMaxWidth,
  getGlassChatBubbleSx,
  getGlassChatLabelColor,
  type GlassChatRole,
} from '@/lib/assistant/glass-chat-bubbles'

type AssistantChatBubbleProps = {
  role: GlassChatRole
  senderLabel?: string
  children: ReactNode
  status?: 'sending'
}

/** Persona-chat bubble — off-white surface aligned with assistant chrome. */
export function AssistantChatBubble({
  role,
  senderLabel,
  children,
  status,
}: AssistantChatBubbleProps) {
  const bubbleStyles = getGlassChatBubbleSx(role, { palette: { mode: 'dark', text: { primary: '#ffffff' } } })
  const align = getGlassChatBubbleAlign(role)
  const maxWidth = getGlassChatBubbleMaxWidth(role)

  return (
    <Stack spacing={0.5} style={{ width: '100%', alignItems: align }}>
      {senderLabel ? (
        <span
          className="plexon-chat-bubble-label"
          style={{ color: getGlassChatLabelColor(role) }}
        >
          {senderLabel}
        </span>
      ) : null}
      <Box
        data-msqdx-surface="light"
        className="plexon-chat-bubble"
        style={{
          ...(bubbleStyles as CSSProperties),
          paddingLeft: '32px',
          paddingRight: '32px',
          paddingTop: '28px',
          paddingBottom: '32px',
          maxWidth: maxWidth.md,
          minWidth: 0,
        }}
      >
        <Box className="plexon-chat-bubble-text">{children}</Box>
        {status === 'sending' ? (
          <Box style={{ display: 'flex', marginTop: '0.5rem', opacity: 0.7 }}>
            <MsqdxIcon name="schedule" customSize={16} />
          </Box>
        ) : null}
      </Box>
    </Stack>
  )
}
