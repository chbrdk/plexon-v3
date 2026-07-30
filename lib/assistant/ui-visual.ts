import { alpha } from '@mui/material';
import { MSQDX_COLORS, MSQDX_SPACING, MSQDX_TYPOGRAPHY } from '@msqdx/tokens';
import type { BrandColor } from '@msqdx/react';
import type { UiTone } from '@/lib/assistant/ui-blocks/types';

/** MSQDX palette, user theme accent, or neutral (slate) — avoids default purple on every block. */
export type UiAccent = BrandColor | 'neutral' | 'theme';

export const UI_BRAND_HEX: Record<BrandColor, string> = {
  purple: MSQDX_COLORS.brand.purple,
  yellow: MSQDX_COLORS.brand.yellow,
  pink: MSQDX_COLORS.brand.pink,
  orange: MSQDX_COLORS.brand.orange,
  green: MSQDX_COLORS.brand.green,
};

export const UI_TONE_BRAND: Record<UiTone, UiAccent | undefined> = {
  neutral: 'neutral',
  success: 'green',
  warning: 'orange',
  error: 'pink',
  info: 'neutral',
};

/** Resolved stroke/fill for shells and icons — neutral uses on-light text, not #b638ff. */
export function uiAccentColor(accent: UiAccent): string {
  if (accent === 'neutral') return 'var(--color-text-on-light)';
  if (accent === 'theme') return uiThemeAccentColor();
  return UI_BRAND_HEX[accent];
}

/** User-selected sidebar accent (`--color-theme-accent`) for optional highlights. */
export function uiThemeAccentColor(): string {
  return 'var(--color-theme-accent)';
}

export const UI_SURFACE_RADIUS = MSQDX_SPACING.borderRadius.lg;
export const UI_SURFACE_RADIUS_PX = `${UI_SURFACE_RADIUS}px`;
export const UI_INNER_RADIUS_PX = `${MSQDX_SPACING.borderRadius.md}px`;

export function brandTint(brand: BrandColor, amount = 0.14): string {
  return alpha(UI_BRAND_HEX[brand], amount);
}

export function uiAccentTint(accent: UiAccent, amount = 0.14): string {
  if (accent === 'neutral') return alpha('#0f172a', amount * 0.85);
  if (accent === 'theme') return 'var(--color-theme-accent-tint)';
  return brandTint(accent, amount);
}

/** Flat card shell — neutral default (grey border, dark stripe); brand only when semantic. */
export function uiBlockShellSx(accent: UiAccent = 'neutral') {
  if (accent === 'neutral') {
    return {
      position: 'relative' as const,
      overflow: 'hidden' as const,
      borderRadius: `${UI_SURFACE_RADIUS}px !important`,
      border: '1px solid var(--color-secondary-dx-grey-light-tint) !important',
      boxShadow: `0 8px 24px ${alpha('#0f172a', 0.06)}`,
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: alpha('#0f172a', 0.07),
        pointerEvents: 'none',
      },
      '& > div:last-of-type': {
        position: 'relative',
        zIndex: 1,
      },
    };
  }

  if (accent === 'theme') {
    return {
      position: 'relative' as const,
      overflow: 'hidden' as const,
      borderRadius: `${UI_SURFACE_RADIUS}px !important`,
      border: '1px solid color-mix(in srgb, var(--color-theme-accent) 28%, transparent) !important',
      boxShadow: `0 8px 24px ${alpha('#0f172a', 0.06)}`,
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        background:
          'linear-gradient(90deg, var(--color-theme-accent) 0%, color-mix(in srgb, var(--color-theme-accent) 35%, transparent) 100%)',
        pointerEvents: 'none',
      },
      '& > div:last-of-type': {
        position: 'relative',
        zIndex: 1,
      },
    };
  }

  const hex = UI_BRAND_HEX[accent];
  return {
    position: 'relative' as const,
    overflow: 'hidden' as const,
    borderRadius: `${UI_SURFACE_RADIUS}px !important`,
    border: `1px solid ${alpha(hex, 0.28)} !important`,
    boxShadow: `0 8px 24px ${alpha('#0f172a', 0.06)}`,
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 4,
      background: `linear-gradient(90deg, ${hex} 0%, ${alpha(hex, 0.35)} 100%)`,
      pointerEvents: 'none',
    },
    '& > div:last-of-type': {
      position: 'relative',
      zIndex: 1,
    },
  };
}

/** Entity card — off-white, rounded, no dark MUI paper. */
export function uiEntityCardSx(accent: UiAccent, interactive = false) {
  const hex = uiAccentColor(accent);
  const borderAlpha = accent === 'neutral' ? 0.12 : 0.32;
  return {
    position: 'relative' as const,
    overflow: 'hidden' as const,
    borderRadius: UI_INNER_RADIUS_PX,
    bgcolor: 'var(--color-card-bg) !important',
    color: 'var(--color-text-on-light)',
    border:
      accent === 'neutral'
        ? '1px solid var(--color-secondary-dx-grey-light-tint)'
        : `1px solid ${alpha(hex, borderAlpha)}`,
    boxShadow: `0 4px 16px ${alpha('#0f172a', 0.05)}`,
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
    ...(interactive
      ? {
          cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: `0 10px 24px ${alpha('#0f172a', 0.08)}`,
            borderColor:
              accent === 'neutral'
                ? alpha('#0f172a', 0.18)
                : alpha(hex, 0.55),
          },
        }
      : {}),
    ...(accent !== 'neutral'
      ? {
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: `linear-gradient(90deg, ${hex}, ${alpha(hex, 0.4)})`,
          },
        }
      : {}),
  };
}

export function uiIconCircleSx(accent: UiAccent) {
  if (accent === 'neutral') {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 44,
      height: 44,
      borderRadius: MSQDX_SPACING.borderRadius.md,
      flexShrink: 0,
      bgcolor: alpha('#0f172a', 0.05),
      color: 'var(--color-text-on-light)',
      border: '1px solid var(--color-secondary-dx-grey-light-tint)',
    };
  }
  if (accent === 'theme') {
    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 44,
      height: 44,
      borderRadius: MSQDX_SPACING.borderRadius.md,
      flexShrink: 0,
      bgcolor: 'var(--color-theme-accent-tint)',
      color: 'var(--color-theme-accent)',
      border: '1px solid color-mix(in srgb, var(--color-theme-accent) 28%, transparent)',
    };
  }
  const hex = UI_BRAND_HEX[accent];
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: MSQDX_SPACING.borderRadius.md,
    flexShrink: 0,
    bgcolor: brandTint(accent, 0.14),
    color: hex,
    border: `1px solid ${alpha(hex, 0.28)}`,
  };
}

export function uiStatPillSx(accent: UiAccent) {
  const hex = uiAccentColor(accent);
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    px: 1.25,
    py: 0.5,
    borderRadius: MSQDX_SPACING.borderRadius.full,
    fontFamily: MSQDX_TYPOGRAPHY.fontFamily.mono,
    fontSize: MSQDX_TYPOGRAPHY.fontSize.xs,
    fontWeight: MSQDX_TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    bgcolor: uiAccentTint(accent, 0.1),
    color: 'var(--color-text-on-light)',
    border:
      accent === 'neutral'
        ? '1px solid var(--color-secondary-dx-grey-light-tint)'
        : `1px solid ${alpha(hex, 0.22)}`,
  };
}

export function uiMetricTileAccentSx(accent: UiAccent) {
  if (accent === 'neutral') {
    return {
      position: 'relative' as const,
      overflow: 'hidden' as const,
      borderRadius: `${MSQDX_SPACING.borderRadius.md}px !important`,
      border: '1px solid var(--color-secondary-dx-grey-light-tint) !important',
      backdropFilter: 'none',
    };
  }
  if (accent === 'theme') {
    return {
      position: 'relative' as const,
      overflow: 'hidden' as const,
      borderRadius: `${MSQDX_SPACING.borderRadius.md}px !important`,
      border: '1px solid color-mix(in srgb, var(--color-theme-accent) 25%, transparent) !important',
      backdropFilter: 'none',
      '&::after': {
        content: '""',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        background: 'var(--color-theme-accent)',
        opacity: 0.85,
        borderRadius: `0 0 ${MSQDX_SPACING.borderRadius.md}px ${MSQDX_SPACING.borderRadius.md}px`,
      },
    };
  }
  const hex = UI_BRAND_HEX[accent];
  return {
    position: 'relative' as const,
    overflow: 'hidden' as const,
    borderRadius: `${MSQDX_SPACING.borderRadius.md}px !important`,
    border: `1px solid ${alpha(hex, 0.25)} !important`,
    backdropFilter: 'none',
    '&::after': {
      content: '""',
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 3,
      background: hex,
      opacity: 0.85,
      borderRadius: `0 0 ${MSQDX_SPACING.borderRadius.md}px ${MSQDX_SPACING.borderRadius.md}px`,
    },
  };
}

export function uiListRowSx(accent: UiAccent, index: number) {
  return {
    px: 1.5,
    py: 1,
    borderRadius: UI_INNER_RADIUS_PX,
    bgcolor: index % 2 === 0 ? uiAccentTint(accent, 0.06) : 'transparent',
    border: `1px solid ${index % 2 === 0 ? uiAccentTint(accent, 0.12) : 'transparent'}`,
  };
}

/** Single finding row with semantic tint (e.g. persona goals / pain points without badge). */
export function uiFindingListItemSx(accent: UiAccent) {
  if (accent === 'neutral') {
    return {
      px: 1.5,
      py: 1,
      borderRadius: UI_INNER_RADIUS_PX,
      bgcolor: alpha('#0f172a', 0.04),
      border: '1px solid var(--color-secondary-dx-grey-light-tint)',
    };
  }
  if (accent === 'theme') {
    return {
      px: 1.5,
      py: 1,
      borderRadius: UI_INNER_RADIUS_PX,
      bgcolor: 'var(--color-theme-accent-tint)',
      border: '1px solid color-mix(in srgb, var(--color-theme-accent) 20%, transparent)',
    };
  }
  const hex = UI_BRAND_HEX[accent];
  return {
    px: 1.5,
    py: 1,
    borderRadius: UI_INNER_RADIUS_PX,
    bgcolor: alpha(hex, 0.12),
    border: `1px solid ${alpha(hex, 0.22)}`,
  };
}
