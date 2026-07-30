'use client';

import type { ComponentProps } from 'react';
import { Box } from '@mui/material';
import { MsqdxCard, type BrandColor } from '@msqdx/react';
import type { MSQDX_SPACING } from '@msqdx/tokens';
import { plexonLightCardSx } from '@/lib/plexon-surface-styles';
import { uiBlockShellSx, type UiAccent } from '@/lib/assistant/ui-visual';
import { UiBlockHeader } from '@/components/assistant-ui/molecules/UiBlockHeader';

type BorderRadiusKey = keyof typeof MSQDX_SPACING.borderRadius;
type MsqdxCardChild = ComponentProps<typeof MsqdxCard>['children'];

type UiBlockSurfaceProps = {
  children: MsqdxCardChild;
  /** Noto Sans block title with Material icon header. */
  title?: string;
  /** Material Symbols icon name — shown beside title. */
  icon?: string;
  borderRadius?: BorderRadiusKey;
  /** Semantic MSQDX brand stripe; default neutral (slate/grey, no purple). */
  brandColor?: UiAccent;
  accent?: UiAccent;
  eyebrow?: string;
  noPadding?: boolean;
  infoTooltip?: string;
  infoTooltipAriaLabel?: string;
  sx?: Record<string, unknown>;
};

function toMsqdxBrand(accent: UiAccent): BrandColor | undefined {
  if (accent === 'neutral' || accent === 'theme') return undefined;
  return accent;
}

/**
 * Flat off-white block shell — rounded corners, Noto Sans / mono header, no glass/blur.
 */
export function UiBlockSurface({
  children,
  title,
  icon,
  borderRadius = 'lg',
  brandColor,
  accent,
  eyebrow,
  noPadding = false,
  infoTooltip,
  infoTooltipAriaLabel,
  sx,
}: UiBlockSurfaceProps) {
  const shellAccent: UiAccent = accent ?? brandColor ?? 'neutral';

  const header =
    title && icon ? (
      <Box sx={noPadding ? { px: 2, pt: 2 } : undefined}>
        <UiBlockHeader
          title={title}
          icon={icon}
          brand={shellAccent}
          eyebrow={eyebrow}
          infoTooltip={infoTooltip}
          infoTooltipAriaLabel={infoTooltipAriaLabel}
        />
      </Box>
    ) : null;

  const body = (
    <>
      {header}
      {children}
    </>
  );

  return (
    <Box data-plexon-assistant-ui sx={{ width: '100%' }}>
      <MsqdxCard
        data-msqdx-surface="light"
        variant="flat"
        borderRadius={borderRadius}
        brandColor={toMsqdxBrand(shellAccent)}
        hoverable
        sx={{
          width: '100%',
          ...plexonLightCardSx,
          ...uiBlockShellSx(shellAccent),
          backdropFilter: 'none !important',
          ...(noPadding ? { '& > div:last-of-type': { padding: 0 } } : {}),
          ...sx,
        }}
      >
        {body}
      </MsqdxCard>
    </Box>
  );
}
