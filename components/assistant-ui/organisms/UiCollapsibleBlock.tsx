'use client';

import { useState } from 'react';
import { Box, Collapse } from '@mui/material';
import { MsqdxTypography } from '@msqdx/react';
import { UiBlockSurface } from '@/components/assistant-ui/templates/UiBlockSurface';
import { MarkdownContent } from '@msqdx/react';

type UiCollapsibleBlockProps = {
  title: string;
  markdown: string;
  defaultOpen?: boolean;
};

export function UiCollapsibleBlock({ title, markdown, defaultOpen = false }: UiCollapsibleBlockProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <UiBlockSurface>
      <Box
        component="button"
        type="button"
        onClick={() => setOpen((v) => !v)}
        sx={{
          display: 'flex',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          p: 0,
          textAlign: 'left',
        }}
      >
        <MsqdxTypography variant="subtitle2">{title}</MsqdxTypography>
        <MsqdxTypography variant="caption">{open ? '▾' : '▸'}</MsqdxTypography>
      </Box>
      <Collapse in={open}>
        <Box sx={{ mt: 1 }}>
          <MarkdownContent content={markdown} />
        </Box>
      </Collapse>
    </UiBlockSurface>
  );
}
