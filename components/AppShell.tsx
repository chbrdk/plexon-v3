'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Box, IconButton, useMediaQuery, useTheme } from '@mui/material';
import { MsqdxAppLayout, MsqdxIcon } from '@msqdx/react';
import { Sidebar } from './Sidebar';
import { BrandColorInitializer } from './settings/BrandColorInitializer';
import { THEME_ACCENT_WITH_FALLBACK } from '@/lib/theme-accent';
import { PATH_LOGIN, PATH_REGISTER } from '@/lib/constants';

const AUTH_PATHS = [PATH_LOGIN, PATH_REGISTER];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileNavOpen, setMobileNavOpen] = useState(true);
  const isAuthPage = AUTH_PATHS.some((p) => pathname === p || pathname?.startsWith(p + '/'));

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <>
      <BrandColorInitializer />
      <MsqdxAppLayout
        appName="PLEXON"
        logo={true}
        borderWidth="thin"
        borderRadius="2xl"
        innerBackground="offwhite"
        sidebar={<Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />}
        sx={{
          '& > div:last-of-type': {
            backgroundColor: `${THEME_ACCENT_WITH_FALLBACK.backgroundColor} !important`,
          },
          '& > div:last-of-type > div': {
            borderColor: `${THEME_ACCENT_WITH_FALLBACK.borderColor} !important`,
          },
          '& > div:last-of-type > div > div:last-of-type': {
            position: 'relative',
            top: 'auto',
            left: 'auto',
            flex: 1,
            minHeight: 0,
          },
          '& > div:last-of-type > div > div:first-of-type': {
            position: 'absolute !important',
            top: 0,
            left: 0,
            zIndex: 100000,
            backgroundColor: 'transparent !important',
            color: 'var(--color-theme-accent-contrast, #ffffff) !important',
          },
          '& > div:last-of-type > div > div:first-of-type *': {
            color: 'inherit !important',
          },
          '& > div:last-of-type > div > div:first-of-type > div': {
            backgroundColor: `${THEME_ACCENT_WITH_FALLBACK.backgroundColor} !important`,
          },
          '& > div:last-of-type > div > div:first-of-type svg': {
            fill: 'currentColor',
          },
        }}
      >
        <Box
          data-plexon-content
          sx={{
            position: 'relative',
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            overflow: 'hidden',
            color: 'var(--color-text-on-light)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children as React.ReactNode}
        </Box>
      </MsqdxAppLayout>
      {isMobile && !mobileNavOpen && (
        <IconButton
          onClick={() => setMobileNavOpen(true)}
          aria-label="Menü öffnen"
          sx={{
            position: 'fixed',
            top: 12,
            left: 12,
            zIndex: 1100,
            backgroundColor: THEME_ACCENT_WITH_FALLBACK.backgroundColor,
            color: 'var(--color-theme-accent-contrast, #fff)',
            '&:hover': {
              backgroundColor: THEME_ACCENT_WITH_FALLBACK.backgroundColor,
              filter: 'brightness(1.1)',
            },
          }}
        >
          <MsqdxIcon name="menu" customSize={24} />
        </IconButton>
      )}
    </>
  );
}
