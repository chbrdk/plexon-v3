'use client';

import { Box } from '@mui/material';
import { MarkdownContent } from '@msqdx/react';
import { MSQDX_TYPOGRAPHY } from '@msqdx/tokens';
import { UI_BLOCK_ICONS, UI_FONT_MONO, uiSansBodySx } from '@/lib/assistant/ui-typography';
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface';

type UiMarkdownBlockProps = {
  markdown: string;
};

export function UiMarkdownBlock({ markdown }: UiMarkdownBlockProps) {
  return (
    <UiBlockSurface icon={UI_BLOCK_ICONS.text}>
      <Box
        sx={{
          ...uiSansBodySx,
          fontSize: MSQDX_TYPOGRAPHY.fontSize.sm,
          '& p': { margin: '0 0 0.5em' },
          '& p:last-child': { marginBottom: 0 },
          '& h2, & h3': {
            ...uiSansBodySx,
            fontWeight: MSQDX_TYPOGRAPHY.fontWeight.semibold,
            fontSize: MSQDX_TYPOGRAPHY.fontSize.lg,
          },
          '& strong': { fontFamily: UI_FONT_MONO },
        }}
      >
        <MarkdownContent content={markdown} />
      </Box>
    </UiBlockSurface>
  );
}
