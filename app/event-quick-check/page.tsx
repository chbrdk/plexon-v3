'use client';

import { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { PlexonAppHeaderV2 } from '@/components/layout/PlexonAppHeaderV2';
import { PlexonPageChrome } from '@/components/layout/PlexonPageChrome';
import { EventQuickCheckPageClient } from '@/components/event-quick-check/EventQuickCheckPageClient';
import { EQC_PAGE_COPY } from '@/lib/assistant/event-quick-check/event-quick-check-page-copy';

export default function EventQuickCheckPage() {
  return (
    <PlexonPageChrome header={<PlexonAppHeaderV2 title={EQC_PAGE_COPY.pageTitle} />}>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Suspense
          fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
              <CircularProgress size={28} />
            </Box>
          }
        >
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <EventQuickCheckPageClient />
          </Box>
        </Suspense>
      </Box>
    </PlexonPageChrome>
  );
}
