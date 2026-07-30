'use client';

import type { ReactNode } from 'react';
import { keyframes } from '@emotion/react';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import { MsqdxIcon } from '@msqdx/react';
import {
  getGlassChatBubbleAlign,
  getGlassChatBubbleMaxWidth,
  getGlassChatBubbleSx,
  getGlassChatLabelColor,
  type GlassChatRole,
} from '@/lib/assistant/glass-chat-bubbles';

const bubbleEnter = keyframes`
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

const textFade = keyframes`
  from { opacity: 0.7; }
  to { opacity: 1; }
`;

type AssistantChatBubbleProps = {
  role: GlassChatRole;
  senderLabel?: string;
  children: ReactNode;
  status?: 'sending';
};

/**
 * AUDION persona-chat bubble — asymmetric radius, colored label, off-white surface.
 * Matches `MsqdxGlassChatPanel` message rows (no card chrome).
 */
export function AssistantChatBubble({
  role,
  senderLabel,
  children,
  status,
}: AssistantChatBubbleProps) {
  const theme = useTheme();
  const bubbleStyles = getGlassChatBubbleSx(role, theme);
  const align = getGlassChatBubbleAlign(role);
  const maxWidth = getGlassChatBubbleMaxWidth(role);

  return (
    <Stack spacing={0.5} alignItems={align} sx={{ width: '100%' }}>
      {senderLabel ? (
        <Typography
          variant="caption"
          sx={{
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: getGlassChatLabelColor(role),
          }}
        >
          {senderLabel}
        </Typography>
      ) : null}
      <Box
        data-msqdx-surface="light"
        sx={{
          ...bubbleStyles,
          paddingLeft: '32px',
          paddingRight: '32px',
          paddingTop: '28px',
          paddingBottom: '32px',
          maxWidth,
          minWidth: 0,
          animation: `${bubbleEnter} 280ms ease`,
          transition: 'transform 200ms ease',
          '& .MuiTypography-root': {
            color: 'inherit',
          },
        }}
      >
        <Box
          sx={{
            animation: `${textFade} 220ms ease`,
            opacity: 1,
          }}
        >
          {children}
        </Box>
        {status === 'sending' ? (
          <Box sx={{ display: 'flex', mt: 1, opacity: 0.7 }}>
            <MsqdxIcon name="schedule" customSize={16} />
          </Box>
        ) : null}
      </Box>
    </Stack>
  );
}
