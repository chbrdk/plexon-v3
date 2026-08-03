'use client'

import { useEffect, useState } from 'react'
import NextLink from 'next/link'
import { Alert, Button, SectionChrome, Spinner, Text } from '@msqdx/ui'
import { CollectionKnowledgeBand } from '@/components/products/CollectionKnowledgeBand'
import { useI18n } from '@/components/i18n/I18nProvider'
import { apiPlatformProjectDashboard, pathAssistantWithProject } from '@/lib/constants'
import type { AudionProjectSummary, CheckionProjectSummary } from '@/lib/platform-project-dashboard-fetch'

type DashboardPayload = {
  platformProject: {
    id: string
    name: string
    companyId: string
    status: string
    domain: string | null
  }
  bindings: Array<{
    productId: string
    externalProjectId: string | null
    syncStatus: string
    syncMessage: string | null
  }>
  checkion: CheckionProjectSummary | null
  audion: AudionProjectSummary | null
  links: { checkionProject: string; audionProject: string }
}

export function PlatformProjectDashboard({ platformProjectId }: { platformProjectId: string }) {
  const { t } = useI18n()
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(apiPlatformProjectDashboard(platformProjectId), {
          credentials: 'same-origin',
        })
        if (!res.ok) {
          const body = await res.text()
          throw new Error(body || res.statusText)
        }
        const json = (await res.json()) as DashboardPayload
        if (!cancelled) setData(json)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : t('projects.detail.loadError'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [platformProjectId, t])

  const meta = data
    ? [
        t('projects.detail.collectionLabel'),
        data.platformProject.status,
        data.platformProject.domain
          ? `${t('projects.detail.domain')}: ${data.platformProject.domain}`
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : null

  return (
    <div className="plexon-magazine plexon-project-detail" data-section="collection-project-home">
      <SectionChrome
        title={data?.platformProject.name ?? t('projects.detail.title')}
        meta={
          meta ? (
            <Text role="meta">{meta}</Text>
          ) : (
            <Text role="meta">{t('projects.detail.subtitle')}</Text>
          )
        }
        action={
          data ? (
            <NextLink href={pathAssistantWithProject(data.platformProject.id)}>
              <Button variant="ghost" size="sm">
                {t('projects.detail.openAssistant')}
              </Button>
            </NextLink>
          ) : null
        }
      />

      {loading ? (
        <Text role="meta">
          <Spinner size="sm" /> {t('common.loading')}
        </Text>
      ) : null}

      {error ? <Alert tone="error">{error}</Alert> : null}

      {data && !loading ? (
        <CollectionKnowledgeBand
          platformProjectId={platformProjectId}
          audionHref={data.links.audionProject}
          checkionHref={data.links.checkionProject}
          checkion={data.checkion}
          audion={data.audion}
          bindings={data.bindings}
        />
      ) : null}
    </div>
  )
}
