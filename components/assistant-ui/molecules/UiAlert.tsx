'use client';

import { alpha } from '@mui/material';
import type { UiTone } from '@/lib/assistant/ui-blocks/types';
import { MSQDX_THEME } from '@msqdx/tokens';
import { UiText } from '@/components/assistant-ui/atoms/UiText';
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface';
import { uiBlockBrandForTone, uiBlockIconForTone } from '@/lib/assistant/ui-typography';

const TONE_TINT: Record<UiTone, string | undefined> = {
  neutral: undefined,
  success: alpha(MSQDX_THEME.light.text.primary, 0.04),
  warning: alpha(MSQDX_THEME.light.text.primary, 0.05),
  error: alpha(MSQDX_THEME.light.text.primary, 0.05),
  info: alpha(MSQDX_THEME.light.text.primary, 0.04),
};

type UiAlertProps = {
  title?: string;
  message: string;
  tone?: UiTone;
};

export function UiAlert({ title, message, tone = 'info' }: UiAlertProps) {
  const brand = uiBlockBrandForTone(tone);
  const tint = TONE_TINT[tone];
  const displayTitle = title ?? 'Hinweis';

  return (
    <UiBlockSurface
      title={displayTitle}
      icon={uiBlockIconForTone(tone)}
      brandColor={brand}
      accent={brand}
      eyebrow={tone}
      sx={tint ? { bgcolor: `${tint} !important` } : undefined}
    >
      <UiText tone={tone}>{message}</UiText>
    </UiBlockSurface>
  );
}
