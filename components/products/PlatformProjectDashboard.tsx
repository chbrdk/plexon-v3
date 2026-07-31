'use client'

import { useEffect, useState } from 'react'
import { Alert, Button, Chip, Panel, SectionChrome, Spinner, StatLede, StatLedeGroup, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import { apiPlatformProjectDashboard } from '@/lib/constants'

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
  checkion: { externalProjectId: string; scanCount: number } | null
  audion: { externalProjectId: string; personaCount: number } | null
  links: { checkionProject: string; audionProject: string }
}

function openExternal(href: string) {
  if (!href) return
  window.open(href, '_blank', 'noopener,noreferrer')
}

function syncTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  const s = status.toLowerCase()
  if (s === 'synced' || s === 'ok' || s === 'healthy') return 'success'
  if (s === 'pending' || s === 'syncing') return 'warning'
  if (s === 'error' || s === 'failed') return 'danger'
  return 'neutral'
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
        data.platformProject.status,
        data.platformProject.domain ? `${t('projects.detail.domain')}: ${data.platformProject.domain}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : null

  return (
    <div className="plexon-magazine plexon-project-detail">
      <SectionChrome
        title={data?.platformProject.name ?? t('projects.detail.title')}
        meta={
          meta ? (
            <Text role="meta">{meta}</Text>
          ) : (
            <Text role="meta">{t('projects.detail.subtitle')}</Text>
          )
        }
      />

      {loading ? (
        <Text role="meta">
          <Spinner size="sm" /> {t('common.loading')}
        </Text>
      ) : null}

      {error ? <Alert tone="error">{error}</Alert> : null}

      {data && !loading ? (
        <>
          <section className="plexon-settings-section" aria-label={t('projects.detail.productsTitle')}>
            <SectionChrome
              title={t('projects.detail.productsTitle')}
              meta={<Text role="meta">{t('projects.detail.productsSubtitle')}</Text>}
            />
            <div className="plexon-project-product-grid">
              <Panel className="plexon-magazine-card">
                <div className="plexon-project-product-head">
                  <Text role="title" as="h3">
                    CHECKION
                  </Text>
                  <Chip static>{data.checkion ? t('projects.detail.linked') : t('projects.detail.notLinked')}</Chip>
                </div>
                {data.checkion ? (
                  <StatLedeGroup aria-label="CHECKION" columns={1}>
                    <StatLede
                      value={data.checkion.scanCount}
                      label={t('projects.detail.scans')}
                      kind="number"
                    />
                  </StatLedeGroup>
                ) : (
                  <Text role="meta">{t('projects.detail.checkionEmpty')}</Text>
                )}
                {data.checkion?.externalProjectId ? (
                  <Text role="meta">
                    {t('projects.detail.localId')}: {data.checkion.externalProjectId}
                  </Text>
                ) : null}
                <Button variant="primary" block onClick={() => openExternal(data.links.checkionProject)}>
                  {t('projects.detail.openCheckion')}
                </Button>
              </Panel>

              <Panel className="plexon-magazine-card">
                <div className="plexon-project-product-head">
                  <Text role="title" as="h3">
                    AUDION
                  </Text>
                  <Chip static>{data.audion ? t('projects.detail.linked') : t('projects.detail.notLinked')}</Chip>
                </div>
                {data.audion ? (
                  <StatLedeGroup aria-label="AUDION" columns={1}>
                    <StatLede
                      value={data.audion.personaCount}
                      label={t('projects.detail.personas')}
                      kind="number"
                    />
                  </StatLedeGroup>
                ) : (
                  <Text role="meta">{t('projects.detail.audionEmpty')}</Text>
                )}
                {data.audion?.externalProjectId ? (
                  <Text role="meta">
                    {t('projects.detail.localId')}: {data.audion.externalProjectId}
                  </Text>
                ) : null}
                <Button variant="primary" block onClick={() => openExternal(data.links.audionProject)}>
                  {t('projects.detail.openAudion')}
                </Button>
              </Panel>
            </div>
          </section>

          <section className="plexon-settings-section" aria-label={t('projects.detail.bindingsTitle')}>
            <SectionChrome
              title={t('projects.detail.bindingsTitle')}
              meta={<Text role="meta">{t('projects.detail.bindingsSubtitle')}</Text>}
            />
            {data.bindings.length === 0 ? (
              <Text role="meta">{t('projects.detail.bindingsEmpty')}</Text>
            ) : (
              <ul className="plexon-project-bindings">
                {data.bindings.map((binding) => (
                  <li key={binding.productId} className="plexon-project-binding">
                    <div className="plexon-project-binding__main">
                      <Text role="title" as="h3">
                        {binding.productId}
                      </Text>
                      <Text role="meta">
                        {binding.externalProjectId
                          ? `${t('projects.detail.externalId')}: ${binding.externalProjectId}`
                          : t('projects.detail.noExternalId')}
                        {binding.syncMessage ? ` · ${binding.syncMessage}` : ''}
                      </Text>
                    </div>
                    <Chip static className={`plexon-sync-chip plexon-sync-chip--${syncTone(binding.syncStatus)}`}>
                      {binding.syncStatus}
                    </Chip>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
