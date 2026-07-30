'use client';

import { useEffect, useRef, useState } from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Stack } from '@mui/material';
import { MsqdxTypography } from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import {
  ADMIN_NAV_STORAGE_KEY,
  PATH_ADMIN,
  PATH_ADMIN_COMPANIES,
  PATH_ADMIN_USERS,
} from '@/lib/constants';
import { THEME_ACCENT_WITH_FALLBACK } from '@/lib/theme-accent';

const links: { href: string; labelKey: 'admin.navOverview' | 'admin.navCompanies' | 'admin.navUsers' }[] = [
  { href: PATH_ADMIN, labelKey: 'admin.navOverview' },
  { href: PATH_ADMIN_COMPANIES, labelKey: 'admin.navCompanies' },
  { href: PATH_ADMIN_USERS, labelKey: 'admin.navUsers' },
];

function labelForAdminPath(path: string, t: (key: string) => string) {
  if (path === PATH_ADMIN) return t('admin.navOverview');
  if (path.startsWith(`${PATH_ADMIN_COMPANIES}/`)) return t('admin.navCompanyDetail');
  if (path === PATH_ADMIN_COMPANIES) return t('admin.navCompanies');
  if (path === PATH_ADMIN_USERS) return t('admin.navUsers');
  if (path.startsWith('/admin')) return t('admin.title');
  return path;
}

export function AdminSubnav() {
  const pathname = usePathname() ?? '';
  const { t } = useI18n();
  const [lastVisit, setLastVisit] = useState<{ path: string; at: number } | null>(null);
  const bootRef = useRef(false);

  useEffect(() => {
    if (!pathname.startsWith('/admin')) return;
    try {
      const raw = typeof window !== 'undefined' ? window.sessionStorage.getItem(ADMIN_NAV_STORAGE_KEY) : null;
      const o = raw ? (JSON.parse(raw) as { currentPath?: string; currentAt?: number }) : {};
      const from = o.currentPath;
      if (bootRef.current && from && from !== pathname) {
        setLastVisit({ path: from, at: Number(o.currentAt) || Date.now() });
      }
      bootRef.current = true;
      window.sessionStorage.setItem(
        ADMIN_NAV_STORAGE_KEY,
        JSON.stringify({ currentPath: pathname, currentAt: Date.now() })
      );
    } catch {
      /* ignore */
    }
  }, [pathname]);

  return (
    <Box
      sx={{
        mb: 3,
        pb: 2,
        borderBottom: '1px solid var(--color-secondary-dx-grey-light-tint)',
      }}
    >
      <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
        {links.map(({ href, labelKey }) => {
          const active =
            href === PATH_ADMIN ? pathname === PATH_ADMIN : pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <NextLink
              key={href}
              href={href}
              style={{
                textDecoration: 'none',
                padding: '8px 14px',
                borderRadius: 'var(--msqdx-radius-md)',
                fontSize: '0.875rem',
                fontWeight: active ? 600 : 500,
                color: active ? 'var(--color-theme-accent-contrast, #fff)' : 'var(--color-text-on-light)',
                backgroundColor: active ? THEME_ACCENT_WITH_FALLBACK.backgroundColor : 'var(--color-bg-subtle)',
                border: `1px solid ${active ? THEME_ACCENT_WITH_FALLBACK.borderColor : 'var(--color-secondary-dx-grey-light-tint)'}`,
              }}
            >
              {t(labelKey)}
            </NextLink>
          );
        })}
      </Stack>
      {lastVisit && lastVisit.path !== pathname ? (
        <MsqdxTypography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'var(--color-text-muted-on-light)' }}>
          {t('admin.lastVisitedPrefix')}{' '}
          <NextLink href={lastVisit.path} style={{ color: 'var(--color-primary-main, #1976d2)' }}>
            {labelForAdminPath(lastVisit.path, t)}
          </NextLink>
          {' · '}
          {new Date(lastVisit.at).toLocaleString()}
        </MsqdxTypography>
      ) : null}
      <MsqdxTypography variant="caption" sx={{ display: 'block', mt: lastVisit && lastVisit.path !== pathname ? 0.5 : 1.5, color: 'var(--color-text-muted-on-light)' }}>
        {t('admin.subtitle')}
      </MsqdxTypography>
    </Box>
  );
}
