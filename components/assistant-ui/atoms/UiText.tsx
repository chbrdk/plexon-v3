'use client';

import { MsqdxTypography } from '@msqdx/react';
import { MSQDX_COLORS } from '@msqdx/tokens';
import type { UiTone } from '@/lib/assistant/ui-blocks/types';
import { uiMonoLabelSx, uiSansBodySx } from '@/lib/assistant/ui-typography';

const TONE_COLOR: Record<UiTone, string> = {
  neutral: 'var(--color-text-on-light)',
  success: MSQDX_COLORS.status.success,
  warning: MSQDX_COLORS.status.warning,
  error: MSQDX_COLORS.status.error,
  info: 'var(--color-text-muted-on-light)',
};

type UiTextRole = 'body' | 'label' | 'caption';

type UiTextProps = {
  children: string | number;
  variant?: 'body2' | 'subtitle2' | 'caption';
  tone?: UiTone;
  /** body = Noto Sans, label/caption = mono uppercase */
  role?: UiTextRole;
  sx?: Record<string, unknown>;
};

export function UiText({
  children,
  variant = 'body2',
  tone = 'neutral',
  role = 'body',
  sx,
}: UiTextProps) {
  const isLabel = role === 'label' || role === 'caption';

  return (
    <MsqdxTypography
      variant={variant}
      sx={{
        ...(isLabel ? uiMonoLabelSx : uiSansBodySx),
        ...(role === 'caption' ? { fontSize: '0.65rem', letterSpacing: '0.08em' } : {}),
        color: isLabel ? 'var(--color-text-muted-on-light)' : TONE_COLOR[tone],
        ...sx,
      }}
    >
      {children}
    </MsqdxTypography>
  );
}
