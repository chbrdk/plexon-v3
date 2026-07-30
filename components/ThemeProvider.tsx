'use client';

import { createTheme, ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { MSQDX_THEME, MSQDX_BRAND_PRIMARY, MSQDX_STATUS } from '@msqdx/tokens';
import type { ReactNode } from 'react';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: MSQDX_BRAND_PRIMARY.green },
    secondary: { main: MSQDX_BRAND_PRIMARY.purple },
    error: { main: MSQDX_STATUS.error.base },
    warning: { main: MSQDX_STATUS.warning.base },
    success: { main: MSQDX_STATUS.success.base },
    info: { main: MSQDX_STATUS.info.base },
    background: {
      default: '#0f172a',
      paper: MSQDX_THEME.dark.surface.primary,
    },
    text: {
      primary: MSQDX_THEME.dark.text.primary,
      secondary: MSQDX_THEME.dark.text.secondary,
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          overflowX: 'hidden',
          maxWidth: '100%',
        },
        body: {
          backgroundColor: '#0f172a',
          color: '#ffffff',
          overflowX: 'hidden',
          maxWidth: '100%',
        },
      },
    },
  },
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
