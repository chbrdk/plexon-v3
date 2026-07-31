'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Spinner, Text } from '@msqdx/ui'
import { AdminSubnav } from '@/components/admin/AdminSubnav'
import { useI18n } from '@/components/i18n/I18nProvider'
import { PATH_HOME, PATH_LOGIN } from '@/lib/constants'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useI18n()
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin'

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(PATH_LOGIN)
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && !isAdmin) {
      router.replace(PATH_HOME)
    }
  }, [status, isAdmin, router])

  if (status === 'loading') {
    return (
      <div className="plexon-magazine" style={{ minHeight: 240, placeContent: 'center' }}>
        <Spinner />
      </div>
    )
  }

  if (status === 'unauthenticated' || !isAdmin) {
    return (
      <div className="plexon-magazine">
        <Text role="meta">{t('admin.forbidden')}</Text>
      </div>
    )
  }

  return (
    <div className="plexon-magazine">
      <Text role="headline" as="h1">
        {t('admin.title')}
      </Text>
      <AdminSubnav />
      {children}
    </div>
  )
}
