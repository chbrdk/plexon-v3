'use client';

import { Box } from '@mui/material';
import { MSQDX_SPACING } from '@msqdx/tokens';

type UiSplitLayoutProps = {
  left: React.ReactNode;
  right: React.ReactNode;
};

/** Two-column layout for paired generative UI blocks. */
export function UiSplitLayout({ left, right }: UiSplitLayoutProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gap: `${MSQDX_SPACING.gap.lg}px`,
        width: '100%',
      }}
    >
      <Box>{left}</Box>
      <Box>{right}</Box>
    </Box>
  );
}
