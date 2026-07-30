'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Box, CircularProgress } from '@mui/material';
import { MsqdxTypography } from '@msqdx/react';
import { AdminSubnav } from '@/components/admin/AdminSubnav';
import { useI18n } from '@/components/i18n/I18nProvider';
import { PATH_HOME, PATH_LOGIN } from '@/lib/constants';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useI18n();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(PATH_LOGIN);
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated' && !isAdmin) {
      router.replace(PATH_HOME);
    }
  }, [status, isAdmin, router]);

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 240, p: 4 }}>
        <CircularProgress size={36} />
      </Box>
    );
  }

  if (status === 'unauthenticated' || !isAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <MsqdxTypography variant="body2" color="text.secondary">
          {t('admin.forbidden')}
        </MsqdxTypography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 1200, mx: 'auto' }}>
      <MsqdxTypography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.02em', mb: 0.5 }}>
        {t('admin.title')}
      </MsqdxTypography>
      <AdminSubnav />
      {children}
    </Box>
  );
}
