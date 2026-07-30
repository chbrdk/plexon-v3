'use client';

import { Box } from '@mui/material';
import { MsqdxIcon } from '@msqdx/react';
import { MSQDX_SPACING } from '@msqdx/tokens';
import type { linkListPropsSchema } from '@/lib/assistant/ui-blocks/schemas';
import type { z } from 'zod';
import { UiLink } from '@/components/assistant-ui/atoms/UiLink';
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface';
import { UI_BLOCK_ICONS } from '@/lib/assistant/ui-typography';
import { brandTint } from '@/lib/assistant/ui-visual';

type Props = z.infer<typeof linkListPropsSchema>;

export function UiLinkList({ title, links }: Props) {
  return (
    <UiBlockSurface title={title} icon={UI_BLOCK_ICONS.link_list} brandColor="green" accent="green">
      <Box component="ul" sx={{ m: 0, pl: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {links.map((link) => (
          <Box
            component="li"
            key={link.href + link.label}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              p: 1.25,
              borderRadius: `${MSQDX_SPACING.borderRadius.sm}px`,
              bgcolor: brandTint('green', 0.08),
              border: `1px solid ${brandTint('green', 0.2)}`,
              transition: 'background-color 0.15s ease',
              '&:hover': { bgcolor: brandTint('green', 0.14) },
            }}
          >
            <MsqdxIcon name={link.external ? 'open_in_new' : 'link'} customSize={18} />
            <UiLink href={link.href} label={link.label} external={link.external} />
          </Box>
        ))}
      </Box>
    </UiBlockSurface>
  );
}
