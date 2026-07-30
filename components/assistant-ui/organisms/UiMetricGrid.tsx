'use client';

import { Box } from '@mui/material';
import { MSQDX_SPACING } from '@msqdx/tokens';
import type { metricGridPropsSchema } from '@/lib/assistant/ui-blocks/schemas';
import type { z } from 'zod';
import type { UiAccent } from '@/lib/assistant/ui-visual';
import { UiMetricTile } from '@/components/assistant-ui/molecules/UiMetricTile';
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface';
import { UI_BLOCK_ICONS } from '@/lib/assistant/ui-typography';

type Props = z.infer<typeof metricGridPropsSchema> & {
  accent?: UiAccent;
};

export function UiMetricGrid({ title, items, accent = 'theme' }: Props) {
  return (
    <UiBlockSurface title={title} icon={UI_BLOCK_ICONS.metric_grid} brandColor={accent} accent={accent}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))',
          gap: `${MSQDX_SPACING.gap.sm}px`,
        }}
      >
        {items.map((item) => (
          <UiMetricTile key={`${item.label}-${item.value}`} item={item} />
        ))}
      </Box>
    </UiBlockSurface>
  );
}
