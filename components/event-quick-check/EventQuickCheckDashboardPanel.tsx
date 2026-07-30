'use client';

import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { MSQDX_SPACING } from '@msqdx/tokens';
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface';

type Props = {
  title?: string;
  icon?: string;
  eyebrow?: string;
  infoTooltip?: string;
  infoTooltipAriaLabel?: string;
  children: ReactNode;
  gridColumn?: { xs?: string; lg?: string };
};

export function EventQuickCheckDashboardPanel({
  title,
  icon,
  eyebrow,
  infoTooltip,
  infoTooltipAriaLabel,
  children,
  gridColumn,
}: Props) {
  return (
    <Box
      sx={{
        gridColumn: gridColumn ?? { xs: '1 / -1', lg: 'span 12' },
        minWidth: 0,
      }}
    >
      <UiBlockSurface
        title={title}
        icon={icon}
        eyebrow={eyebrow}
        infoTooltip={infoTooltip}
        infoTooltipAriaLabel={infoTooltipAriaLabel}
        sx={{ height: '100%' }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: `${MSQDX_SPACING.scale.sm}px`,
          }}
        >
          {children}
        </Box>
      </UiBlockSurface>
    </Box>
  );
}
