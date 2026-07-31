'use client'

import { useEffect, useRef, useState } from 'react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import {
  ADMIN_NAV_STORAGE_KEY,
  PATH_ADMIN,
  PATH_ADMIN_COMPANIES,
  PATH_ADMIN_USERS,
} from '@/lib/constants'

const links: { href: string; labelKey: 'admin.navOverview' | 'admin.navCompanies' | 'admin.navUsers' }[] = [
  { href: PATH_ADMIN, labelKey: 'admin.navOverview' },
  { href: PATH_ADMIN_COMPANIES, labelKey: 'admin.navCompanies' },
  { href: PATH_ADMIN_USERS, labelKey: 'admin.navUsers' },
]

function labelForAdminPath(path: string, t: (key: string) => string) {
  if (path === PATH_ADMIN) return t('admin.navOverview')
  if (path.startsWith(`${PATH_ADMIN_COMPANIES}/`)) return t('admin.navCompanyDetail')
  if (path === PATH_ADMIN_COMPANIES) return t('admin.navCompanies')
  if (path === PATH_ADMIN_USERS) return t('admin.navUsers')
  if (path.startsWith('/admin')) return t('admin.title')
  return path
}

export function AdminSubnav() {
  const pathname = usePathname() ?? ''
  const { t } = useI18n()
  const [lastVisit, setLastVisit] = useState<{ path: string; at: number } | null>(null)
  const bootRef = useRef(false)

  useEffect(() => {
    if (!pathname.startsWith('/admin')) return
    try {
      const raw = typeof window !== 'undefined' ? window.sessionStorage.getItem(ADMIN_NAV_STORAGE_KEY) : null
      const o = raw ? (JSON.parse(raw) as { currentPath?: string; currentAt?: number }) : {}
      const from = o.currentPath
      if (bootRef.current && from && from !== pathname) {
        setLastVisit({ path: from, at: Number(o.currentAt) || Date.now() })
      }
      bootRef.current = true
      window.sessionStorage.setItem(
        ADMIN_NAV_STORAGE_KEY,
        JSON.stringify({ currentPath: pathname, currentAt: Date.now() }),
      )
    } catch {
      /* ignore */
    }
  }, [pathname])

  return (
    <div className="plexon-admin-subnav-wrap">
      <nav className="plexon-admin-subnav" aria-label={t('admin.title')}>
        {links.map(({ href, labelKey }) => {
          const active =
            href === PATH_ADMIN ? pathname === PATH_ADMIN : pathname === href || pathname.startsWith(`${href}/`)
          return (
            <NextLink
              key={href}
              href={href}
              className="plexon-admin-subnav__link"
              data-active={active ? 'true' : undefined}
            >
              {t(labelKey)}
            </NextLink>
          )
        })}
      </nav>
      {lastVisit && lastVisit.path !== pathname ? (
        <Text role="meta" className="plexon-admin-subnav-meta">
          {t('admin.lastVisitedPrefix')}{' '}
          <NextLink href={lastVisit.path} className="plexon-admin-link">
            {labelForAdminPath(lastVisit.path, t)}
          </NextLink>
          {' · '}
          {new Date(lastVisit.at).toLocaleString()}
        </Text>
      ) : null}
      <Text role="meta" className="plexon-admin-subnav-meta">
        {t('admin.subtitle')}
      </Text>
    </div>
  )
}
