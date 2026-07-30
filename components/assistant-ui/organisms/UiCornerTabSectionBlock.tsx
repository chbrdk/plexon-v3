'use client';

import {
  MarkdownContent,
  MsqdxCornerTabSection,
  MsqdxCornerTabSectionTab,
  MsqdxTypography,
} from '@msqdx/react';
import { Box } from '@mui/material';
import { MSQDX_SPACING } from '@msqdx/tokens';
import type { cornerTabSectionPropsSchema } from '@/lib/assistant/ui-blocks/schemas';
import type { z } from 'zod';

type Props = z.infer<typeof cornerTabSectionPropsSchema>;

export function UiCornerTabSectionBlock({
  tabLabel,
  title,
  markdown,
  placement = 'top-right',
}: Props) {
  return (
    <Box data-msqdx-surface="light" data-plexon-assistant-ui sx={{ borderRadius: `${MSQDX_SPACING.borderRadius.lg}px`, overflow: 'hidden' }}>
      <MsqdxCornerTabSection
        placement={placement}
        tab={
          <MsqdxCornerTabSectionTab
            heading={
              <MsqdxTypography variant="subtitle2" weight="semibold">
                {tabLabel}
              </MsqdxTypography>
            }
          />
        }
        tabAriaLabel={tabLabel}
      >
        <Box sx={{ p: 1.5 }}>
          {title ? (
            <MsqdxTypography variant="h6" sx={{ mb: 1 }}>
              {title}
            </MsqdxTypography>
          ) : null}
          <MarkdownContent content={markdown} />
        </Box>
      </MsqdxCornerTabSection>
    </Box>
  );
}
