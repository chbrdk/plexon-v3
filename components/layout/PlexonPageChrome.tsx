'use client';

import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { APP_HEADER_V2_CONTENT_PADDING_TOP } from '@/lib/layout/app-header-v2-layout';

type PlexonPageChromeProps = {
  header?: ReactNode;
  children: ReactNode;
};

/**
 * AUDION-style page shell: relative column, absolute header at top, main fills area with v2 padding-top.
 */
export function PlexonPageChrome({ header, children }: PlexonPageChromeProps) {
  return (
    <Box
      sx={{
        position: 'relative',
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {header}
      <Box
        component="main"
        data-plexon-page-chrome-main
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: 0,
          paddingTop: header ? `${APP_HEADER_V2_CONTENT_PADDING_TOP} !important` : undefined,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
