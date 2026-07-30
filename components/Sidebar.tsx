'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { MsqdxAdminNav } from '@msqdx/react';
import type { AdminNavItem } from '@msqdx/react';
import NextLink from 'next/link';
import { Box } from '@mui/material';
import { THEME_ACCENT_WITH_FALLBACK } from '@/lib/theme-accent';
import { useI18n } from '@/components/i18n/I18nProvider';
import { filterPlexonShellNavItemsForRole, PLEXON_SHELL_NAV_ITEMS } from '@/lib/platform-products';
import { PATH_ADMIN } from '@/lib/constants';
import { USER_ROLE } from '@/lib/db/schema';

export type SidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

export function Sidebar({ open = true, onClose = () => {} }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { data: session } = useSession();
  const viewerRole = (session?.user as { role?: string } | undefined)?.role ?? null;
  const isAdmin = viewerRole === USER_ROLE.ADMIN;

  const NAV_ITEMS: AdminNavItem[] = useMemo(() => {
    const visibleItems = filterPlexonShellNavItemsForRole(PLEXON_SHELL_NAV_ITEMS, viewerRole);
    const primary = visibleItems.filter((item) => item.section === 'primary').map((item) => ({
      label: t(item.labelKey),
      path: item.path,
      icon: item.icon,
    }));
    if (isAdmin) {
      primary.push({
        label: t('nav.adminConsole'),
        path: PATH_ADMIN,
        icon: 'admin_panel_settings',
      });
    }
    return primary;
  }, [t, isAdmin, viewerRole]);

  const EXTERNAL_ITEMS: AdminNavItem[] = filterPlexonShellNavItemsForRole(PLEXON_SHELL_NAV_ITEMS, viewerRole)
    .filter((item) => item.section === 'secondary')
    .map((item) => ({
      label: t(item.labelKey),
      path: item.path,
      icon: item.icon,
    }));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <MsqdxAdminNav
        open={open}
        onClose={onClose}
        currentPath={pathname}
        items={NAV_ITEMS}
        externalItems={EXTERNAL_ITEMS}
        linkComponent={NextLink as any}
        sx={{
          backgroundColor: THEME_ACCENT_WITH_FALLBACK.backgroundColor,
          borderRightColor: THEME_ACCENT_WITH_FALLBACK.borderColor,
          color: 'var(--color-theme-accent-contrast, #ffffff)',
          '& a': { color: 'inherit' },
          '& .MuiIconButton-root': { color: 'var(--color-theme-accent-contrast, #ffffff)' },
        }}
      />
    </Box>
  );
}
