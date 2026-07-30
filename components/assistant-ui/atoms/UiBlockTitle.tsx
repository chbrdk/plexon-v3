'use client';

import { MsqdxTypography } from '@msqdx/react';
import { MSQDX_SPACING } from '@msqdx/tokens';
import { uiSansTitleSx } from '@/lib/assistant/ui-typography';

type UiBlockTitleProps = {
  children: string;
  sx?: Record<string, unknown>;
};

export function UiBlockTitle({ children, sx }: UiBlockTitleProps) {
  return (
    <MsqdxTypography
      variant="h6"
      sx={{
        ...uiSansTitleSx,
        fontSize: MSQDX_SPACING.scale.md,
        mb: `${MSQDX_SPACING.scale.sm}px`,
        ...sx,
      }}
    >
      {children}
    </MsqdxTypography>
  );
}
