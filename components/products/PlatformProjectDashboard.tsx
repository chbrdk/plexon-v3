'use client'

import { useEffect, useState } from 'react'
import NextLink from 'next/link'
import { Alert, Button, Chip, Panel, SectionChrome, Spinner, StatLede, StatLedeGroup, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import {
  buildAudionChatUrl,
  buildAudionPersonaUrl,
  buildAudionTargetGroupUrl,
} from '@/lib/audion-admin-launch-url'
import { apiPlatformProjectDashboard, getAudionWebOrigin, pathAssistantWithProject } from '@/lib/constants'
import type { AudionProjectSummary } from '@/lib/platform-project-dashboard-fetch'

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
  audion: AudionProjectSummary | null
  links: { checkionProject: string; audionProject: string }
}

function openExternal(href: string) {
  if (!href) return
  window.open(href, '_blank', 'noopener,noreferrer')
}

function syncTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  const s = status.toLowerCase()
  if (s === 'synced' || s === 'ok' || s === 'healthy' || s === 'in_sync') return 'success'
  if (s === 'pending' || s === 'syncing') return 'warning'
  if (s === 'error' || s === 'failed') return 'danger'
  return 'neutral'
}

function productLabel(productId: string): string {
  if (productId === 'checkion') return 'CHECKION'
  if (productId === 'audion') return 'AUDION'
  return productId
}

function audionStripLabel(
  audion: AudionProjectSummary,
  t: (key: string) => string
): string {
  const tg = audion.targetGroupCount ?? 0
  const personas = audion.personaCount ?? 0
  return ` · ${tg} ${t('projects.detail.targetGroups')} · ${personas} ${t('projects.detail.personas')}`
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

  const audionOrigin = getAudionWebOrigin()
  const targetGroups = data?.audion?.targetGroups ?? []
  const personas = data?.audion?.personas ?? []
  const catalogEmpty =
    Boolean(data?.audion) && targetGroups.length === 0 && personas.length === 0

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
            <NextLink
              href={pathAssistantWithProject(data.platformProject.id)}
              className="ds-btn ds-btn--ghost ds-btn--sm"
            >
              {t('projects.detail.openAssistant')}
            </NextLink>
          ) : null
        }
      />

      {data && !loading ? (
        <div className="plexon-project-capability-strip" aria-label={t('projects.detail.productsTitle')}>
          <span
            className="plexon-capability-chip"
            data-state={data.checkion ? 'on' : 'off'}
          >
            CHECKION
            {data.checkion ? ` · ${data.checkion.scanCount} ${t('projects.detail.scans')}` : ''}
          </span>
          <span className="plexon-capability-chip" data-state={data.audion ? 'on' : 'off'}>
            AUDION
            {data.audion ? audionStripLabel(data.audion, t) : ''}
          </span>
        </div>
      ) : null}

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
              as="h3"
              quiet
            />
            <div className="plexon-project-product-grid">
              <Panel className="plexon-magazine-card">
                <div className="plexon-project-product-head">
                  <Text role="title" as="h3">
                    CHECKION
                  </Text>
                  <Chip static>
                    {data.checkion ? t('projects.detail.linked') : t('projects.detail.notLinked')}
                  </Chip>
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
                  <Chip static>
                    {data.audion ? t('projects.detail.linked') : t('projects.detail.notLinked')}
                  </Chip>
                </div>
                {data.audion ? (
                  <StatLedeGroup aria-label="AUDION" columns={2}>
                    <StatLede
                      value={data.audion.targetGroupCount ?? 0}
                      label={t('projects.detail.targetGroups')}
                      kind="number"
                    />
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

          {data.audion ? (
            <section className="plexon-settings-section" aria-label={t('projects.detail.audionCatalogTitle')}>
              <SectionChrome
                title={t('projects.detail.audionCatalogTitle')}
                meta={<Text role="meta">{t('projects.detail.audionCatalogSubtitle')}</Text>}
                as="h3"
                quiet
              />
              {catalogEmpty ? (
                <Text role="meta">{t('projects.detail.audionCatalogEmpty')}</Text>
              ) : (
                <div className="plexon-project-product-grid">
                  <Panel className="plexon-magazine-card">
                    <Text role="title" as="h3">
                      {t('projects.detail.targetGroups')}
                    </Text>
                    {targetGroups.length === 0 ? (
                      <Text role="meta">{t('projects.detail.audionCatalogEmptyTargetGroups')}</Text>
                    ) : (
                      <ul className="plexon-project-bindings">
                        {targetGroups.map((group) => (
                          <li key={group.id} className="plexon-project-binding">
                            <div className="plexon-project-binding__main">
                              <Text role="title" as="h4">
                                {group.name}
                              </Text>
                              <Text role="meta">
                                {[group.segment, `${group.personaCount} ${t('projects.detail.personas')}`]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </Text>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                openExternal(buildAudionTargetGroupUrl(audionOrigin, group.id))
                              }
                            >
                              {t('projects.detail.openInAudion')}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Panel>

                  <Panel className="plexon-magazine-card">
                    <Text role="title" as="h3">
                      {t('projects.detail.personas')}
                    </Text>
                    {personas.length === 0 ? (
                      <Text role="meta">{t('projects.detail.audionCatalogEmptyPersonas')}</Text>
                    ) : (
                      <ul className="plexon-project-bindings">
                        {personas.map((persona) => (
                          <li key={persona.id} className="plexon-project-binding">
                            <div className="plexon-project-binding__main">
                              <Text role="title" as="h4">
                                {persona.name}
                              </Text>
                              <Text role="meta">{persona.role}</Text>
                            </div>
                            <div className="plexon-collection-card-actions">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  openExternal(buildAudionPersonaUrl(audionOrigin, persona.id))
                                }
                              >
                                {t('projects.detail.openInAudion')}
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() =>
                                  openExternal(
                                    buildAudionChatUrl(audionOrigin, {
                                      personaId: persona.id,
                                      projectId: data.audion!.externalProjectId,
                                    })
                                  )
                                }
                              >
                                {t('projects.detail.startChat')}
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Panel>
                </div>
              )}
            </section>
          ) : null}

          <section className="plexon-settings-section" aria-label={t('projects.detail.bindingsTitle')}>
            <SectionChrome
              title={t('projects.detail.bindingsTitle')}
              meta={<Text role="meta">{t('projects.detail.bindingsSubtitle')}</Text>}
              as="h3"
              quiet
            />
            {data.bindings.length === 0 ? (
              <Text role="meta">{t('projects.detail.bindingsEmpty')}</Text>
            ) : (
              <ul className="plexon-project-bindings">
                {data.bindings.map((binding) => (
                  <li key={binding.productId} className="plexon-project-binding">
                    <div className="plexon-project-binding__main">
                      <Text role="title" as="h3">
                        {productLabel(binding.productId)}
                      </Text>
                      <Text role="meta">
                        {binding.externalProjectId
                          ? `${t('projects.detail.externalId')}: ${binding.externalProjectId}`
                          : t('projects.detail.noExternalId')}
                        {binding.syncMessage ? ` · ${binding.syncMessage}` : ''}
                      </Text>
                    </div>
                    <Chip
                      static
                      className={`plexon-sync-chip plexon-sync-chip--${syncTone(binding.syncStatus)}`}
                    >
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
