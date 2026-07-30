'use client';

import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import {
  APP_HEADER_V2_BAR_CLASS,
  APP_HEADER_V2_BAR_MASK_CLASS,
  APP_HEADER_V2_BASE_BAR_CLASS,
  APP_HEADER_V2_CARD_CLASS,
  APP_HEADER_V2_CARD_END_CLASS,
  APP_HEADER_V2_CARD_START_CLASS,
  APP_HEADER_V2_PAGE_TITLE_CLASS,
  APP_HEADER_V2_PAGE_TITLE_LABEL_CLASS,
  APP_HEADER_V2_ROW_CLASS,
  APP_HEADER_LOGO_INSET_PX,
} from '@/lib/layout/app-header-v2-layout';

export type PlexonAppHeaderV2Props = {
  title: string;
  /** Optional back control (left of card, logo-height slot). */
  start?: ReactNode;
  /** Extra actions beside the page title (right). */
  end?: ReactNode;
  /** Optional left area inside the card (pickers, breadcrumbs). */
  cardStart?: ReactNode;
};

/**
 * AUDION v2 header chrome — absolute top bar, logo inset row, title on the right in rounded card.
 * Pair with `PlexonPageChrome` for correct stacking and content padding.
 */
export function PlexonAppHeaderV2({ title, start, end, cardStart }: PlexonAppHeaderV2Props) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return null;

  return (
    <Box
      className={`${APP_HEADER_V2_BAR_MASK_CLASS} ${APP_HEADER_V2_BAR_CLASS}`}
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1300,
        overflow: 'visible',
        '--msqdx-admin-header-logo-inset': `${APP_HEADER_LOGO_INSET_PX}px`,
      }}
    >
      <Box
        component="header"
        className={`${APP_HEADER_V2_BASE_BAR_CLASS} ${APP_HEADER_V2_BAR_CLASS}`}
        suppressHydrationWarning
        sx={{
          position: 'relative',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          minHeight: 'auto',
          overflow: 'visible',
        }}
      >
        <Box sx={{ display: 'flex', flex: 1, minWidth: 0, width: '100%' }}>
          <Box className={APP_HEADER_V2_ROW_CLASS}>
            {start ? <Box className="msqdx-glass-admin-header-v2-back">{start}</Box> : null}
            <Box className={APP_HEADER_V2_CARD_CLASS}>
              {cardStart ? (
                <Box className={APP_HEADER_V2_CARD_START_CLASS}>{cardStart}</Box>
              ) : null}
              <Box className={APP_HEADER_V2_CARD_END_CLASS}>
                <Box className={APP_HEADER_V2_PAGE_TITLE_CLASS}>
                  <span className={APP_HEADER_V2_PAGE_TITLE_LABEL_CLASS}>{trimmedTitle}</span>
                </Box>
                {end}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
