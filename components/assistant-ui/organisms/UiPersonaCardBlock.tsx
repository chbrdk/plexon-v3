'use client';

import { Box } from '@mui/material';
import { MSQDX_SPACING } from '@msqdx/tokens';
import type { personaCardPropsSchema } from '@/lib/assistant/ui-blocks/schemas';
import type { z } from 'zod';
import { PlexonEntityCard } from '@/components/assistant-ui/molecules/PlexonEntityCard';
import { UI_BLOCK_ICONS } from '@/lib/assistant/ui-typography';
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface';

type Props = z.infer<typeof personaCardPropsSchema> & {
  /** Omit block header (e.g. when parent panel already shows section title). */
  hideHeader?: boolean;
  /** Single column — card spans full container width. */
  fullWidth?: boolean;
};

export function personaCardGridTemplate(fullWidth?: boolean): string {
  return fullWidth ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))';
}

export function UiPersonaCardBlock({
  title,
  personas,
  hideHeader = false,
  fullWidth = false,
}: Props) {
  const cards = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: personaCardGridTemplate(fullWidth),
        gap: `${MSQDX_SPACING.gap.md}px`,
      }}
    >
      {personas.map((persona) => (
        <PlexonEntityCard
          key={persona.id}
          brandColor="pink"
          icon="face"
          title={persona.name}
          subtitle={persona.segment}
          description={persona.headline}
          badge={`${Math.round((persona.confidence ?? 0) * 100)}%`}
          stats={[
            {
              icon: 'psychology',
              label: 'Persona',
              brand: 'pink',
            },
          ]}
          onClick={
            persona.actionHref
              ? () => window.open(persona.actionHref, '_blank', 'noopener,noreferrer')
              : undefined
          }
        />
      ))}
    </Box>
  );

  if (hideHeader) {
    return (
      <Box data-plexon-assistant-ui sx={{ width: '100%' }}>
        {cards}
      </Box>
    );
  }

  return (
    <UiBlockSurface title={title} icon={UI_BLOCK_ICONS.persona_card} brandColor="pink" accent="pink">
      {cards}
    </UiBlockSurface>
  );
}
