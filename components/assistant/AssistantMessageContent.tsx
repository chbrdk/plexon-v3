'use client';

import { Box } from '@mui/material';
import { MarkdownContent, MsqdxTypography } from '@msqdx/react';
import { MSQDX_TYPOGRAPHY } from '@msqdx/tokens';
import { ASSISTANT_MESSAGE_CONTENT_TYPE } from '@/lib/assistant/capabilities-overview';
import { AssistantCapabilitiesOverview } from '@/components/assistant/AssistantCapabilitiesOverview';

type AssistantMessageContentProps = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  contentType?: string | null;
};

export function AssistantMessageContent({ role, content, contentType }: AssistantMessageContentProps) {
  const isUser = role === 'user';

  if (isUser) {
    return (
      <MsqdxTypography
        variant="body2"
        sx={{
          whiteSpace: 'pre-wrap',
          fontFamily: MSQDX_TYPOGRAPHY.fontFamily.primary,
          lineHeight: MSQDX_TYPOGRAPHY.lineHeight.relaxed,
        }}
      >
        {content}
      </MsqdxTypography>
    );
  }

  if (contentType === ASSISTANT_MESSAGE_CONTENT_TYPE.CAPABILITIES_OVERVIEW) {
    return <AssistantCapabilitiesOverview />;
  }

  return (
    <Box
      sx={{
        fontFamily: MSQDX_TYPOGRAPHY.fontFamily.primary,
        fontSize: MSQDX_TYPOGRAPHY.fontSize.sm,
        lineHeight: MSQDX_TYPOGRAPHY.lineHeight.relaxed,
        '& p': { margin: '0 0 0.65em' },
        '& p:last-child': { marginBottom: 0 },
        '& h2, & h3': {
          marginTop: '0.5em',
          marginBottom: '0.35em',
          fontFamily: MSQDX_TYPOGRAPHY.fontFamily.mono,
          fontWeight: MSQDX_TYPOGRAPHY.fontWeight.semibold,
        },
        '& ul': { margin: '0.35em 0', paddingLeft: '1.25em' },
        '& li': { marginBottom: '0.25em' },
      }}
    >
      <MarkdownContent content={content} />
    </Box>
  );
}
