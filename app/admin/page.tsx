'use client'

import { useEffect, useState } from 'react'
import NextLink from 'next/link'
import { SectionChrome, StatLede, StatLedeGroup, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import {
  API_ADMIN_COMPANIES,
  API_ADMIN_USERS,
  PATH_ADMIN_COMPANIES,
  PATH_ADMIN_USERS,
  PATH_HOME,
} from '@/lib/constants'
import { PLEXON_FEDERATION_CONTRACT_VERSION } from '@/lib/platform-contract'

export default function AdminOverviewPage() {
  const { t } = useI18n()
  const [stats, setStats] = useState<{ companies: number | null; users: number | null }>({
    companies: null,
    users: null,
  })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [cRes, uRes] = await Promise.all([
          fetch(API_ADMIN_COMPANIES, { credentials: 'same-origin' }),
          fetch(API_ADMIN_USERS, { credentials: 'same-origin' }),
        ])
        const cData = await cRes.json().catch(() => ({}))
        const uData = await uRes.json().catch(() => ({}))
        if (cancelled) return
        const companies = cRes.ok && Array.isArray(cData.items) ? cData.items.length : null
        const users = uRes.ok && Array.isArray(uData.data) ? uData.data.length : null
        setStats({ companies, users })
      } catch {
        if (!cancelled) setStats({ companies: null, users: null })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="plexon-admin-stack">
      <section className="plexon-settings-section" aria-label={t('admin.overviewCard')}>
        <SectionChrome
          title={t('admin.overviewCard')}
          meta={<Text role="meta">{t('admin.overviewIntro')}</Text>}
        />
        {(stats.companies !== null || stats.users !== null) && (
          <StatLedeGroup aria-label={t('admin.overviewStatsTitle')} columns={2}>
            {stats.companies !== null ? (
              <StatLede value={stats.companies} label={t('admin.navCompanies')} kind="number" />
            ) : null}
            {stats.users !== null ? (
              <StatLede value={stats.users} label={t('admin.navUsers')} kind="number" />
            ) : null}
          </StatLedeGroup>
        )}
        <div className="plexon-settings-actions">
          <NextLink href={PATH_ADMIN_COMPANIES} className="ds-btn ds-btn--primary ds-btn--sm">
            {t('admin.goCompanies')}
          </NextLink>
          <NextLink href={PATH_ADMIN_USERS} className="ds-btn ds-btn--ghost ds-btn--sm">
            {t('admin.goUsers')}
          </NextLink>
          <NextLink href={PATH_HOME} className="ds-btn ds-btn--ghost ds-btn--sm">
            {t('admin.goDashboard')}
          </NextLink>
        </div>
      </section>

      <section className="plexon-settings-section" aria-label={t('admin.federationContract')}>
        <SectionChrome
          title={t('admin.federationContract')}
          meta={<Text role="meta">{t('admin.dashboardUserEditHint')}</Text>}
        />
        <Text role="meta" className="plexon-admin-mono">
          {PLEXON_FEDERATION_CONTRACT_VERSION}
        </Text>
      </section>
    </div>
  )
}
