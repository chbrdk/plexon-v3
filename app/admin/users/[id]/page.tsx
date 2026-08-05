'use client'

import NextLink from 'next/link'
import { useParams } from 'next/navigation'
import { Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import { AdminUserEditForm } from '@/components/admin/AdminUserEditForm'
import { PATH_ADMIN_USERS } from '@/lib/constants'

export default function AdminUserEditPage() {
  const params = useParams<{ id: string }>()
  const userId = typeof params.id === 'string' ? params.id : ''
  const { t } = useI18n()

  if (!userId) {
    return (
      <div className="plexon-admin-stack">
        <Text role="meta">{t('admin.loadError')}</Text>
        <NextLink href={PATH_ADMIN_USERS} className="plexon-admin-link">
          ← {t('admin.back')}
        </NextLink>
      </div>
    )
  }

  return (
    <div className="plexon-admin-stack">
      <NextLink href={PATH_ADMIN_USERS} className="plexon-admin-link">
        ← {t('admin.back')}
      </NextLink>
      <AdminUserEditForm userId={userId} />
    </div>
  )
}
