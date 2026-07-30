'use client';

import { Box } from '@mui/material';
import { MSQDX_SPACING } from '@msqdx/tokens';
import type { targetGroupCardPropsSchema } from '@/lib/assistant/ui-blocks/schemas';
import type { z } from 'zod';
import { PlexonEntityCard } from '@/components/assistant-ui/molecules/PlexonEntityCard';
import { UI_BLOCK_ICONS } from '@/lib/assistant/ui-typography';
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface';

type Props = z.infer<typeof targetGroupCardPropsSchema>;

export function UiTargetGroupCardBlock({ title, targetGroups }: Props) {
  return (
    <UiBlockSurface title={title} icon={UI_BLOCK_ICONS.target_group_card}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: `${MSQDX_SPACING.gap.md}px`,
        }}
      >
        {targetGroups.map((tg) => (
          <PlexonEntityCard
            key={tg.id}
            brandColor="neutral"
            icon="groups"
            title={tg.name}
            subtitle={tg.segment}
            description={tg.description}
            stats={[
              {
                icon: 'person',
                label: `${tg.personaCount} Personas`,
                brand: 'pink',
              },
              {
                icon: 'menu_book',
                label: `${tg.knowledgeEntryCount} Knowledge`,
                brand: 'green',
              },
            ]}
            onClick={
              tg.actionHref
                ? () => window.open(tg.actionHref, '_blank', 'noopener,noreferrer')
                : undefined
            }
          />
        ))}
      </Box>
    </UiBlockSurface>
  );
}
