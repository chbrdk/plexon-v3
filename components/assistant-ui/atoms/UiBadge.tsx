'use client';

import { MsqdxChip } from '@msqdx/react';
import type { UiTone } from '@/lib/assistant/ui-blocks/types';

const TONE_BRAND: Record<UiTone, 'green' | 'orange' | 'pink' | 'purple' | undefined> = {
  neutral: undefined,
  success: 'green',
  warning: 'orange',
  error: 'pink',
  info: undefined,
};

type UiBadgeProps = {
  label: string;
  tone?: UiTone;
};

export function UiBadge({ label, tone = 'neutral' }: UiBadgeProps) {
  const brandColor = TONE_BRAND[tone];
  return <MsqdxChip label={label} size="small" {...(brandColor ? { brandColor } : {})} />;
}
