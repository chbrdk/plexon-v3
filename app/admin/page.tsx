'use client';

import { useEffect, useState } from 'react';
import NextLink from 'next/link';
import { Stack } from '@mui/material';
import { MsqdxTypography, MsqdxCard, MsqdxButton } from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import {
  API_ADMIN_COMPANIES,
  API_ADMIN_USERS,
  PATH_ADMIN_COMPANIES,
  PATH_ADMIN_USERS,
  PATH_HOME,
} from '@/lib/constants';
import { PLEXON_FEDERATION_CONTRACT_VERSION } from '@/lib/platform-contract';

export default function AdminOverviewPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState<{ companies: number | null; users: number | null }>({
    companies: null,
    users: null,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [cRes, uRes] = await Promise.all([
          fetch(API_ADMIN_COMPANIES, { credentials: 'same-origin' }),
          fetch(API_ADMIN_USERS, { credentials: 'same-origin' }),
        ]);
        const cData = await cRes.json().catch(() => ({}));
        const uData = await uRes.json().catch(() => ({}));
        if (cancelled) return;
        const companies = cRes.ok && Array.isArray(cData.items) ? cData.items.length : null;
        const users = uRes.ok && Array.isArray(uData.data) ? uData.data.length : null;
        setStats({ companies, users });
      } catch {
        if (!cancelled) setStats({ companies: null, users: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Stack spacing={3}>
      <MsqdxCard
        variant="flat"
        borderRadius="button"
        sx={{
          p: 'var(--msqdx-spacing-md)',
          border: '1px solid var(--color-secondary-dx-grey-light-tint)',
          bgcolor: 'var(--color-card-bg)',
        }}
      >
        <MsqdxTypography variant="h6" weight="semibold" sx={{ mb: 1 }}>
          {t('admin.overviewCard')}
        </MsqdxTypography>
        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)', mb: 2 }}>
          {t('admin.overviewIntro')}
        </MsqdxTypography>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          <NextLink href={PATH_ADMIN_COMPANIES} style={{ textDecoration: 'none' }}>
            <MsqdxButton variant="contained">{t('admin.goCompanies')}</MsqdxButton>
          </NextLink>
          <NextLink href={PATH_ADMIN_USERS} style={{ textDecoration: 'none' }}>
            <MsqdxButton variant="outlined">{t('admin.goUsers')}</MsqdxButton>
          </NextLink>
          <NextLink href={PATH_HOME} style={{ textDecoration: 'none' }}>
            <MsqdxButton variant="outlined">{t('admin.goDashboard')}</MsqdxButton>
          </NextLink>
        </Stack>
        {(stats.companies !== null || stats.users !== null) && (
          <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)', mt: 2 }}>
            <strong>{t('admin.overviewStatsTitle')}</strong>
            {stats.companies !== null ? ` · ${t('admin.overviewStatsCompanies', { count: stats.companies })}` : ''}
            {stats.users !== null ? ` · ${t('admin.overviewStatsUsers', { count: stats.users })}` : ''}
          </MsqdxTypography>
        )}
      </MsqdxCard>

      <MsqdxCard
        variant="flat"
        borderRadius="button"
        sx={{
          p: 'var(--msqdx-spacing-md)',
          border: '1px solid var(--color-secondary-dx-grey-light-tint)',
          bgcolor: 'var(--color-card-bg)',
        }}
      >
        <MsqdxTypography variant="subtitle1" weight="semibold" sx={{ mb: 1 }}>
          {t('admin.federationContract')}
        </MsqdxTypography>
        <MsqdxTypography variant="body2" sx={{ fontFamily: 'monospace' }}>
          {PLEXON_FEDERATION_CONTRACT_VERSION}
        </MsqdxTypography>
        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)', mt: 2 }}>
          {t('admin.dashboardUserEditHint')}
        </MsqdxTypography>
      </MsqdxCard>
    </Stack>
  );
}
