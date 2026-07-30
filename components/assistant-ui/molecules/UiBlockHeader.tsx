'use client';

import { Box, Stack } from '@mui/material';
import { MsqdxIcon } from '@msqdx/react';
import { MSQDX_SPACING, MSQDX_TYPOGRAPHY } from '@msqdx/tokens';
import type { UiAccent } from '@/lib/assistant/ui-visual';
import { uiIconCircleSx } from '@/lib/assistant/ui-visual';
import { uiMonoLabelSx, uiSansTitleSx } from '@/lib/assistant/ui-typography';
import { InfoTooltip } from '@/components/InfoTooltip';

type UiBlockHeaderProps = {
  title: string;
  icon: string;
  brand?: UiAccent;
  /** Optional mono eyebrow above the sans title. */
  eyebrow?: string;
  /** Info-button tooltip explaining the section. */
  infoTooltip?: string;
  infoTooltipAriaLabel?: string;
};

export function UiBlockHeader({
  title,
  icon,
  brand = 'neutral',
  eyebrow,
  infoTooltip,
  infoTooltipAriaLabel,
}: UiBlockHeaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: `${MSQDX_SPACING.gap.sm}px`,
        mb: `${MSQDX_SPACING.scale.sm}px`,
        pb: `${MSQDX_SPACING.scale.xs}px`,
        borderBottom: '1px solid var(--color-secondary-dx-grey-light-tint)',
      }}
    >
      <Box sx={uiIconCircleSx(brand)}>
        <MsqdxIcon name={icon as 'dashboard'} customSize={20} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        {eyebrow ? (
          <Box component="span" sx={{ ...uiMonoLabelSx, display: 'block', mb: 0.25 }}>
            {eyebrow}
          </Box>
        ) : null}
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
          <Box component="h3" sx={{ ...uiSansTitleSx, m: 0, fontSize: MSQDX_TYPOGRAPHY.fontSize.lg }}>
            {title}
          </Box>
          {infoTooltip ? (
            <InfoTooltip
              title={infoTooltip}
              placement="top"
              ariaLabel={infoTooltipAriaLabel ?? `Erklärung: ${title}`}
            />
          ) : null}
        </Stack>
      </Box>
    </Box>
  );
}
