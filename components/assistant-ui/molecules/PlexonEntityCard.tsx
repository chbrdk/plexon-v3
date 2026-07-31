'use client';

import type { KeyboardEvent } from 'react';
import { Box } from '@mui/material';
import { MsqdxIcon, MsqdxTypography } from '@msqdx/react';
import { MSQDX_SPACING, MSQDX_TYPOGRAPHY } from '@msqdx/tokens';
import type { BrandColor } from '@msqdx/react';
import { uiEntityCardSx, uiIconCircleSx, uiStatPillSx, type UiAccent } from '@/lib/assistant/ui-visual';
import { uiMonoLabelSx, uiSansBodySx, uiSansTitleSx } from '@/lib/assistant/ui-typography';

export type PlexonEntityStat = {
  icon: string;
  label: string;
  brand?: BrandColor;
};

type PlexonEntityCardProps = {
  brandColor?: UiAccent;
  icon: string;
  title: string;
  subtitle?: string;
  description?: string;
  badge?: string;
  stats?: PlexonEntityStat[];
  onClick?: () => void;
};

/** Rounded entity card — Noto Sans titles, mono labels, Material icons, no blur. */
export function PlexonEntityCard({
  brandColor = 'neutral',
  icon,
  title,
  subtitle,
  description,
  badge,
  stats = [],
  onClick,
}: PlexonEntityCardProps) {
  const interactive = Boolean(onClick);

  return (
    <Box
      data-msqdx-surface="light"
      data-plexon-assistant-ui
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e: KeyboardEvent<HTMLDivElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      sx={{
        ...uiEntityCardSx(brandColor, interactive),
        p: `${MSQDX_SPACING.scale.md}px`,
        pt: `${MSQDX_SPACING.scale.sm + 6}px`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: description ? 1 : 0.5 }}>
        <Box sx={uiIconCircleSx(brandColor)}>
          <MsqdxIcon name={icon as 'groups'} customSize={22} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <MsqdxTypography variant="subtitle1" sx={{ ...uiSansTitleSx, fontSize: MSQDX_TYPOGRAPHY.fontSize.xl }}>
              {title}
            </MsqdxTypography>
            {badge ? (
              <Box component="span" sx={{ ...uiStatPillSx(brandColor), py: 0.25, px: 1, fontSize: '0.65rem' }}>
                {badge}
              </Box>
            ) : null}
          </Box>
          {subtitle ? (
            <Box component="span" sx={{ ...uiMonoLabelSx, display: 'block', mt: 0.5 }}>
              {subtitle}
            </Box>
          ) : null}
        </Box>
      </Box>
      {description ? (
        <MsqdxTypography
          variant="body2"
          sx={{
            ...uiSansBodySx,
            opacity: 0.92,
            mb: stats.length ? 1.25 : 0,
            pl: 0.5,
          }}
        >
          {description}
        </MsqdxTypography>
      ) : null}
      {stats.length > 0 ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
          {stats.map((stat) => (
            <Box key={stat.label} component="span" sx={uiStatPillSx(stat.brand ?? brandColor)}>
              <MsqdxIcon name={stat.icon as 'person'} customSize={14} />
              {stat.label}
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
