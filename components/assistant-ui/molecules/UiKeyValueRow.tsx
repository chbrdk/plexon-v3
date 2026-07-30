'use client';

import { Box } from '@mui/material';
import { MsqdxIcon } from '@msqdx/react';
import { uiMonoLabelSx, uiSansTitleSx } from '@/lib/assistant/ui-typography';

type UiKeyValueRowProps = {
  label: string;
  value: string | number;
  icon?: string;
};

export function UiKeyValueRow({ label, value, icon }: UiKeyValueRowProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        {icon ? <MsqdxIcon name={icon as 'label'} customSize={16} /> : null}
        <Box component="span" sx={uiMonoLabelSx}>
          {label}
        </Box>
      </Box>
      <Box component="span" sx={{ ...uiSansTitleSx, fontSize: '1rem', textAlign: 'right' }}>
        {value}
      </Box>
    </Box>
  );
}
