'use client';

import { Box, Stack } from '@mui/material';
import type { findingListPropsSchema } from '@/lib/assistant/ui-blocks/schemas';
import type { z } from 'zod';
import { UiBadge } from '@/components/assistant-ui/atoms/UiBadge';
import { UiText } from '@/components/assistant-ui/atoms/UiText';
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface';
import { UI_BLOCK_ICONS, uiBlockBrandForTone } from '@/lib/assistant/ui-typography';
import { uiFindingListItemSx, uiListRowSx } from '@/lib/assistant/ui-visual';
import type { UiTone } from '@/lib/assistant/ui-blocks/types';

type Props = z.infer<typeof findingListPropsSchema> & {
  /** Hide severity chips (e.g. persona goals with tinted rows). */
  showSeverityBadge?: boolean;
  /** Apply a full-row semantic tint instead of alternating stripes. */
  itemTint?: boolean;
};

function severityLabel(severity: UiTone | undefined): string | null {
  switch (severity) {
    case 'error':
      return 'Kritisch';
    case 'warning':
      return 'Warnung';
    case 'success':
      return 'Positiv';
    case 'info':
      return 'Hinweis';
    default:
      return null;
  }
}

export function UiFindingList({
  title,
  items,
  showSeverityBadge = true,
  itemTint = false,
}: Props) {
  return (
    <UiBlockSurface title={title ?? 'Erkenntnisse'} icon={UI_BLOCK_ICONS.finding_list}>
      <Stack spacing={1}>
        {items.map((item, index) => {
          const tone = item.severity ?? 'neutral';
          const badge = showSeverityBadge ? severityLabel(item.severity) : null;
          const accent = uiBlockBrandForTone(tone);
          const description = item.description?.trim();
          return (
            <Box
              key={`${item.title}-${index}`}
              sx={itemTint ? uiFindingListItemSx(accent) : uiListRowSx(accent, index)}
            >
              <Stack spacing={0.75}>
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                  <UiText variant="subtitle2" tone={itemTint ? 'neutral' : tone}>
                    {item.title}
                  </UiText>
                  {badge ? <UiBadge label={badge} tone={tone} /> : null}
                </Stack>
                {description ? <UiText tone="neutral">{description}</UiText> : null}
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </UiBlockSurface>
  );
}
