'use client'

import { useEffect, useState } from 'react'
import NextLink from 'next/link'
import { Alert, Button, CardActions, Chip, Panel, SectionChrome, Spinner, StatLede, StatLedeGroup, Text } from '@msqdx/ui'
import { CollectionKnowledgeBand } from '@/components/products/CollectionKnowledgeBand'
import { useI18n } from '@/components/i18n/I18nProvider'
import {
  buildAudionChatUrl,
  buildAudionJourneyUrl,
  buildAudionPersonaUrl,
  buildAudionStudyUrl,
  buildAudionTargetGroupUrl,
} from '@/lib/audion-admin-launch-url'
import { apiPlatformProjectDashboard, getAudionWebOrigin, pathAssistantWithProject } from '@/lib/constants'
import { pathCheckionDomainResult, pathCheckionScanResult } from '@/lib/paths/checkion-api'
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

function checkionStripLabel(
  checkion: CheckionProjectSummary,
  t: (key: string) => string
): string {
  const domain = checkion.domainScanCount ?? 0
  const standalone = checkion.standaloneScanCount ?? 0
  return ` · ${domain} ${t('projects.detail.domainScans')} · ${standalone} ${t('projects.detail.standaloneScans')}`
}

function audionStripLabel(
  audion: AudionProjectSummary,
  t: (key: string) => string
): string {
  const tg = audion.targetGroupCount ?? 0
  const personas = audion.personaCount ?? 0
  const journeys = audion.journeyCount ?? 0
  const studies = audion.studyCount ?? 0
  return ` · ${tg} ${t('projects.detail.targetGroups')} · ${personas} ${t('projects.detail.personas')} · ${journeys} ${t('projects.detail.journeys')} · ${studies} ${t('projects.detail.studies')}`
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
  const journeys = data?.audion?.journeys ?? []
  const studies = data?.audion?.studies ?? []
  const catalogEmpty =
    Boolean(data?.audion) &&
    targetGroups.length === 0 &&
    personas.length === 0 &&
    journeys.length === 0 &&
    studies.length === 0
  const domainScans = data?.checkion?.domainScans ?? []
  const standaloneScans = data?.checkion?.standaloneScans ?? []
  const checkionCatalogEmpty =
    Boolean(data?.checkion) && domainScans.length === 0 && standaloneScans.length === 0

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
            {data.checkion ? checkionStripLabel(data.checkion, t) : ''}
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
        <CollectionKnowledgeBand
          platformProjectId={platformProjectId}
          audionHref={data.links.audionProject}
          checkionHref={data.links.checkionProject}
        />
      ) : null}

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
                  <StatLedeGroup aria-label="CHECKION" columns={2}>
                    <StatLede
                      value={data.checkion.domainScanCount ?? 0}
                      label={t('projects.detail.domainScans')}
                      kind="number"
                    />
                    <StatLede
                      value={data.checkion.standaloneScanCount ?? 0}
                      label={t('projects.detail.standaloneScans')}
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
                    <StatLede
                      value={data.audion.journeyCount ?? 0}
                      label={t('projects.detail.journeys')}
                      kind="number"
                    />
                    <StatLede
                      value={data.audion.studyCount ?? 0}
                      label={t('projects.detail.studies')}
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

          {data.checkion ? (
            <section className="plexon-settings-section" aria-label={t('projects.detail.checkionCatalogTitle')}>
              <SectionChrome
                title={t('projects.detail.checkionCatalogTitle')}
                meta={<Text role="meta">{t('projects.detail.checkionCatalogSubtitle')}</Text>}
                as="h3"
                quiet
              />
              {checkionCatalogEmpty ? (
                <Text role="meta">{t('projects.detail.checkionCatalogEmpty')}</Text>
              ) : (
                <div className="plexon-project-product-grid">
                  <Panel className="plexon-magazine-card">
                    <Text role="title" as="h3">
                      {t('projects.detail.domainScans')}
                    </Text>
                    {domainScans.length === 0 ? (
                      <Text role="meta">{t('projects.detail.checkionCatalogEmptyDomain')}</Text>
                    ) : (
                      <ul className="plexon-project-bindings">
                        {domainScans.map((scan) => (
                          <li key={scan.id} className="plexon-project-binding">
                            <div className="plexon-project-binding__main">
                              <Text role="title" as="h4">
                                {scan.domain}
                              </Text>
                              <Text role="meta">
                                {[
                                  scan.status,
                                  typeof scan.score === 'number' ? `Score ${scan.score}` : null,
                                  scan.totalPages
                                    ? `${scan.totalPages} ${t('projects.detail.pages')}`
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </Text>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openExternal(pathCheckionDomainResult(scan.id))}
                            >
                              {t('projects.detail.openInCheckion')}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Panel>

                  <Panel className="plexon-magazine-card">
                    <Text role="title" as="h3">
                      {t('projects.detail.standaloneScans')}
                    </Text>
                    {standaloneScans.length === 0 ? (
                      <Text role="meta">{t('projects.detail.checkionCatalogEmptyStandalone')}</Text>
                    ) : (
                      <ul className="plexon-project-bindings">
                        {standaloneScans.map((scan) => (
                          <li key={scan.id} className="plexon-project-binding">
                            <div className="plexon-project-binding__main">
                              <Text role="title" as="h4">
                                {scan.url}
                              </Text>
                              <Text role="meta">
                                {typeof scan.score === 'number' ? `Score ${scan.score}` : ''}
                              </Text>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openExternal(pathCheckionScanResult(scan.id))}
                            >
                              {t('projects.detail.openInCheckion')}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Panel>
                </div>
              )}
            </section>
          ) : null}

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
                            <CardActions
                              hairline={false}
                              className="plexon-collection-card-actions"
                            >
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
                            </CardActions>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Panel>

                  <Panel className="plexon-magazine-card">
                    <Text role="title" as="h3">
                      {t('projects.detail.journeys')}
                    </Text>
                    {journeys.length === 0 ? (
                      <Text role="meta">{t('projects.detail.audionCatalogEmptyJourneys')}</Text>
                    ) : (
                      <ul className="plexon-project-bindings">
                        {journeys.map((journey) => (
                          <li key={journey.id} className="plexon-project-binding">
                            <div className="plexon-project-binding__main">
                              <Text role="title" as="h4">
                                {journey.name}
                              </Text>
                              <Text role="meta">
                                {[
                                  journey.status,
                                  journey.journeyType,
                                  `${journey.phaseCount} ${t('projects.detail.phases')}`,
                                  journey.targetGroupName,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </Text>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                openExternal(buildAudionJourneyUrl(audionOrigin, journey.id))
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
                      {t('projects.detail.studies')}
                    </Text>
                    {studies.length === 0 ? (
                      <Text role="meta">{t('projects.detail.audionCatalogEmptyStudies')}</Text>
                    ) : (
                      <ul className="plexon-project-bindings">
                        {studies.map((study) => (
                          <li key={study.id} className="plexon-project-binding">
                            <div className="plexon-project-binding__main">
                              <Text role="title" as="h4">
                                {study.name}
                              </Text>
                              <Text role="meta">
                                {[
                                  study.status,
                                  `${study.waveCount} ${t('projects.detail.waves')}`,
                                  study.targetUrlKey,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </Text>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                openExternal(buildAudionStudyUrl(audionOrigin, study.id))
                              }
                            >
                              {t('projects.detail.openInAudion')}
                            </Button>
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
