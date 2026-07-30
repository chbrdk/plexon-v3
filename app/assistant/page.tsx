'use client';

import { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useI18n } from '@/components/i18n/I18nProvider';
import { AssistantChat } from '@/components/assistant/AssistantChat';
import { PlexonAppHeaderV2 } from '@/components/layout/PlexonAppHeaderV2';
import { PlexonPageChrome } from '@/components/layout/PlexonPageChrome';

export default function AssistantPage() {
  const { t } = useI18n();

  return (
    <PlexonPageChrome header={<PlexonAppHeaderV2 title={t('assistant.title')} />}>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          px: { xs: 0.5, md: 1 },
          pb: { xs: 0.5, md: 1 },
        }}
      >
        <Suspense
          fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
              <CircularProgress size={28} />
            </Box>
          }
        >
          <AssistantChat />
        </Suspense>
      </Box>
    </PlexonPageChrome>
  );
}
