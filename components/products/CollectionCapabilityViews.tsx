'use client'

import { Button, CardActions, Chip, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import {
  buildAudionChatUrl,
  buildAudionJourneyUrl,
  buildAudionPersonaUrl,
  buildAudionStudyUrl,
  buildAudionTargetGroupUrl,
} from '@/lib/audion-admin-launch-url'
import { getAudionWebOrigin } from '@/lib/constants'
import { pathCheckionDomainResult, pathCheckionScanResult } from '@/lib/paths/checkion-api'
import type {
  AudionProjectSummary,
  CheckionProjectSummary,
} from '@/lib/platform-project-dashboard-fetch'

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

export type CollectionBinding = {
  productId: string
  externalProjectId: string | null
  syncStatus: string
  syncMessage: string | null
}

export function CheckionCapabilityView({
  checkion,
  href,
}: {
  checkion: CheckionProjectSummary | null
  href: string
}) {
  const { t } = useI18n()
  const domainScans = checkion?.domainScans ?? []
  const standaloneScans = checkion?.standaloneScans ?? []
  const empty = Boolean(checkion) && domainScans.length === 0 && standaloneScans.length === 0

  return (
    <div className="plexon-capability-pane">
      <header className="plexon-knowledge-facet-tile-head">
        <div>
          <Text role="meta" as="p" className="plexon-collection-card-kicker">
            {t('projects.detail.capabilityLocalBadge')}
          </Text>
          <Text role="headline" as="h3" className="plexon-knowledge-facet-title">
            CHECKION
          </Text>
          <Text role="meta" as="p">
            {t('projects.detail.checkionCatalogSubtitle')}
          </Text>
        </div>
        <Chip static size="sm">
          {checkion ? t('projects.detail.linked') : t('projects.detail.notLinked')}
        </Chip>
      </header>

      {!checkion ? (
        <Text role="meta">{t('projects.detail.checkionEmpty')}</Text>
      ) : (
        <>
          <Text role="meta">
            {checkion.domainScanCount} {t('projects.detail.domainScans')} ·{' '}
            {checkion.standaloneScanCount} {t('projects.detail.standaloneScans')}
            {checkion.externalProjectId
              ? ` · ${t('projects.detail.localId')}: ${checkion.externalProjectId}`
              : ''}
          </Text>

          {empty ? (
            <Text role="meta">{t('projects.detail.checkionCatalogEmpty')}</Text>
          ) : (
            <div className="plexon-capability-catalog">
              <div className="plexon-capability-catalog-block">
                <Text role="title" as="h4">
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
              </div>

              <div className="plexon-capability-catalog-block">
                <Text role="title" as="h4">
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
              </div>
            </div>
          )}
        </>
      )}

      <div className="plexon-knowledge-facet-tile-actions">
        <Button variant="ghost" size="md" onClick={() => openExternal(href)}>
          {t('projects.detail.openCheckion')}
        </Button>
      </div>
    </div>
  )
}

export function AudionCapabilityView({
  audion,
  href,
}: {
  audion: AudionProjectSummary | null
  href: string
}) {
  const { t } = useI18n()
  const audionOrigin = getAudionWebOrigin()
  const targetGroups = audion?.targetGroups ?? []
  const personas = audion?.personas ?? []
  const journeys = audion?.journeys ?? []
  const studies = audion?.studies ?? []
  const empty =
    Boolean(audion) &&
    targetGroups.length === 0 &&
    personas.length === 0 &&
    journeys.length === 0 &&
    studies.length === 0

  return (
    <div className="plexon-capability-pane">
      <header className="plexon-knowledge-facet-tile-head">
        <div>
          <Text role="meta" as="p" className="plexon-collection-card-kicker">
            {t('projects.detail.capabilityLocalBadge')}
          </Text>
          <Text role="headline" as="h3" className="plexon-knowledge-facet-title">
            AUDION
          </Text>
          <Text role="meta" as="p">
            {t('projects.detail.audionCatalogSubtitle')}
          </Text>
        </div>
        <Chip static size="sm">
          {audion ? t('projects.detail.linked') : t('projects.detail.notLinked')}
        </Chip>
      </header>

      {!audion ? (
        <Text role="meta">{t('projects.detail.audionEmpty')}</Text>
      ) : (
        <>
          <Text role="meta">
            {audion.targetGroupCount ?? 0} {t('projects.detail.targetGroups')} ·{' '}
            {audion.personaCount} {t('projects.detail.personas')} ·{' '}
            {audion.journeyCount ?? 0} {t('projects.detail.journeys')} ·{' '}
            {audion.studyCount ?? 0} {t('projects.detail.studies')}
            {audion.externalProjectId
              ? ` · ${t('projects.detail.localId')}: ${audion.externalProjectId}`
              : ''}
          </Text>

          {empty ? (
            <Text role="meta">{t('projects.detail.audionCatalogEmpty')}</Text>
          ) : (
            <div className="plexon-capability-catalog">
              <div className="plexon-capability-catalog-block">
                <Text role="title" as="h4">
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
              </div>

              <div className="plexon-capability-catalog-block">
                <Text role="title" as="h4">
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
                        <CardActions hairline={false} className="plexon-collection-card-actions">
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
                                  projectId: audion.externalProjectId,
                                }),
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
              </div>

              <div className="plexon-capability-catalog-block">
                <Text role="title" as="h4">
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
              </div>

              <div className="plexon-capability-catalog-block">
                <Text role="title" as="h4">
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
              </div>
            </div>
          )}
        </>
      )}

      <div className="plexon-knowledge-facet-tile-actions">
        <Button variant="ghost" size="md" onClick={() => openExternal(href)}>
          {t('projects.detail.openAudion')}
        </Button>
      </div>
    </div>
  )
}

export function BindingsCapabilityView({ bindings }: { bindings: CollectionBinding[] }) {
  const { t } = useI18n()

  return (
    <div className="plexon-capability-pane">
      <header className="plexon-knowledge-facet-tile-head">
        <div>
          <Text role="meta" as="p" className="plexon-collection-card-kicker">
            {t('projects.detail.capabilityLocalBadge')}
          </Text>
          <Text role="headline" as="h3" className="plexon-knowledge-facet-title">
            {t('projects.detail.bindingsTitle')}
          </Text>
          <Text role="meta" as="p">
            {t('projects.detail.bindingsSubtitle')}
          </Text>
        </div>
      </header>

      {bindings.length === 0 ? (
        <Text role="meta">{t('projects.detail.bindingsEmpty')}</Text>
      ) : (
        <ul className="plexon-project-bindings">
          {bindings.map((binding) => (
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
    </div>
  )
}
