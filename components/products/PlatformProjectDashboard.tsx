'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import NextLink from 'next/link'
import { Alert, Button, SectionChrome, Spinner, Text } from '@msqdx/ui'
import {
  CollectionKnowledgeBand,
  type CollectionWorkNavId,
} from '@/components/products/CollectionKnowledgeBand'
import {
  CollectionOverviewBand,
  type DashboardFlowsSummary,
  type DashboardKnowledgeSummary,
} from '@/components/products/CollectionOverviewBand'
import { useI18n } from '@/components/i18n/I18nProvider'
import { apiPlatformProjectDashboard, pathAssistantWithProject } from '@/lib/constants'
import { CollectionLifecycleActions } from '@/components/projects/CollectionLifecycleActions'
import { CollectionClientSharesPanel } from '@/components/projects/CollectionClientSharesPanel'
import { CollectionClientRoomPanel } from '@/components/projects/CollectionClientRoomPanel'
import { CollectionTeamPanel } from '@/components/projects/CollectionTeamPanel'
import { CollectionActivityBand } from '@/components/projects/CollectionActivityBand'
import { CollectionCompetitiveSpaceBand } from '@/components/projects/CollectionCompetitiveSpaceBand'
import type {
  AudionProjectSummary,
  BrandionProjectSummary,
  CheckionProjectSummary,
  CreationProjectSummary,
  MetronProjectSummary,
} from '@/lib/platform-project-dashboard-fetch'

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
  brandion: BrandionProjectSummary | null
  creation: CreationProjectSummary | null
  metron: MetronProjectSummary | null
  knowledge?: DashboardKnowledgeSummary | null
  flows?: DashboardFlowsSummary | null
  activity?: { items: Array<{
    id: string
    at: string
    productId: string
    kind: string
    status: string
    subjectRef: string
    title: string
    href: string | null
  }> } | null
  links: {
    checkionProject: string
    audionProject: string
    brandionProject: string
    creationProject: string
    metronProject: string
    videonProject?: string
    spirionProject?: string
    echonProject?: string
  }
}

export function PlatformProjectDashboard({ platformProjectId }: { platformProjectId: string }) {
  const { t } = useI18n()
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [workNav, setWorkNav] = useState<CollectionWorkNavId>('profile')
  const [reloadKey, setReloadKey] = useState(0)
  const workBandRef = useRef<HTMLElement | null>(null)

  const openWork = useCallback((id: CollectionWorkNavId) => {
    setWorkNav(id)
    requestAnimationFrame(() => {
      workBandRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

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
  }, [platformProjectId, t, reloadKey])

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
            <div className="plexon-project-detail-actions">
              <CollectionLifecycleActions
                platformProjectId={data.platformProject.id}
                status={data.platformProject.status}
                onChanged={() => setReloadKey((k) => k + 1)}
              />
              <NextLink href={pathAssistantWithProject(data.platformProject.id)}>
                <Button variant="ghost" size="sm">
                  {t('projects.detail.openAssistant')}
                </Button>
              </NextLink>
            </div>
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
        <>
          <CollectionOverviewBand
            platformProjectId={platformProjectId}
            domain={data.platformProject.domain}
            checkion={data.checkion}
            audion={data.audion}
            brandion={data.brandion}
            metron={data.metron ?? null}
            bindings={data.bindings}
            knowledge={data.knowledge ?? null}
            flows={data.flows ?? null}
            onOpenWork={openWork}
          />
          <CollectionActivityBand
            platformProjectId={platformProjectId}
            flows={data.flows ?? null}
            bindings={data.bindings}
            activityItems={data.activity?.items ?? []}
            onOpenWork={openWork}
          />
          <CollectionCompetitiveSpaceBand
            platformProjectId={platformProjectId}
            audion={data.audion}
            onOpenWork={openWork}
          />
          <CollectionTeamPanel platformProjectId={platformProjectId} />
          <CollectionClientRoomPanel platformProjectId={platformProjectId} />
          <CollectionClientSharesPanel platformProjectId={platformProjectId} />
          <CollectionKnowledgeBand
            platformProjectId={platformProjectId}
            audionHref={data.links.audionProject}
            checkionHref={data.links.checkionProject}
            brandionHref={data.links.brandionProject}
            creationHref={data.links.creationProject ?? ''}
            metronHref={data.links.metronProject ?? ''}
            videonHref={data.links.videonProject ?? ''}
            spirionHref={data.links.spirionProject ?? ''}
            echonHref={data.links.echonProject ?? ''}
            checkion={data.checkion}
            audion={data.audion}
            brandion={data.brandion}
            creation={data.creation ?? null}
            metron={data.metron ?? null}
            bindings={data.bindings}
            openNav={workNav}
            onOpenNav={setWorkNav}
            workBandRef={workBandRef}
          />
        </>
      ) : null}
    </div>
  )
}
