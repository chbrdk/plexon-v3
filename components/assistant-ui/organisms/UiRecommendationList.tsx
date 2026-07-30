'use client';

import { Box, Stack } from '@mui/material';
import type { recommendationListPropsSchema } from '@/lib/assistant/ui-blocks/schemas';
import type { z } from 'zod';
import { UiBadge } from '@/components/assistant-ui/atoms/UiBadge';
import { UiText } from '@/components/assistant-ui/atoms/UiText';
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface';
import { UI_BLOCK_ICONS } from '@/lib/assistant/ui-typography';
import { uiListRowSx } from '@/lib/assistant/ui-visual';

type Props = z.infer<typeof recommendationListPropsSchema>;

function priorityTone(priority: number | undefined): 'error' | 'warning' | 'info' | 'neutral' {
  if (priority == null) return 'neutral';
  if (priority <= 2) return 'error';
  if (priority === 3) return 'warning';
  return 'info';
}

export function UiRecommendationList({ title, items }: Props) {
  return (
    <UiBlockSurface title={title ?? 'Handlungsempfehlungen'} icon={UI_BLOCK_ICONS.recommendation_list}>
      <Stack spacing={1}>
        {items.map((item, index) => {
          const tone = priorityTone(item.priority);
          return (
            <Box key={`${item.title}-${index}`} sx={uiListRowSx('neutral', index)}>
              <Stack spacing={0.75}>
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                  <UiText variant="subtitle2">{item.title}</UiText>
                  {item.priority != null ? (
                    <UiBadge label={`P${item.priority}`} tone={tone} />
                  ) : null}
                  {item.category ? <UiBadge label={item.category} tone="neutral" /> : null}
                </Stack>
                {item.description ? <UiText tone="neutral">{item.description}</UiText> : null}
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </UiBlockSurface>
  );
}
