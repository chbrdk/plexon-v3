'use client';

import { Box } from '@mui/material';
import type { keyValueListPropsSchema } from '@/lib/assistant/ui-blocks/schemas';
import type { z } from 'zod';
import { UiKeyValueRow } from '@/components/assistant-ui/molecules/UiKeyValueRow';
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface';
import { UI_BLOCK_ICONS } from '@/lib/assistant/ui-typography';
import { uiListRowSx } from '@/lib/assistant/ui-visual';

type Props = z.infer<typeof keyValueListPropsSchema>;

export function UiKeyValueList({ title, items }: Props) {
  return (
    <UiBlockSurface title={title} icon={UI_BLOCK_ICONS.key_value_list}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {items.map((item, index) => (
          <Box key={item.label} sx={uiListRowSx('neutral', index)}>
            <UiKeyValueRow label={item.label} value={item.value} icon="label" />
          </Box>
        ))}
      </Box>
    </UiBlockSurface>
  );
}
