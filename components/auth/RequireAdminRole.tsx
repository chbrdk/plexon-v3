'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Spinner } from '@msqdx/ui';
import { useI18n } from '@/components/i18n/I18nProvider';
import { PATH_HOME, PATH_LOGIN } from '@/lib/constants';
import { USER_ROLE } from '@/lib/db/schema';

export function RequireAdminRole({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useI18n();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === USER_ROLE.ADMIN;

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
      <div className="plexon-admin-gate plexon-admin-gate--loading" role="status" aria-busy="true">
        <Spinner size="md" />
      </div>
    );
  }

  if (status === 'unauthenticated' || !isAdmin) {
    return (
      <div className="plexon-admin-gate plexon-admin-gate--forbidden">
        <p className="plexon-admin-gate__msg">{t('admin.forbidden')}</p>
      </div>
    );
  }

  return <>{children}</>;
}
