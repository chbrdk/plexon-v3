'use client'

import { useEffect, useState } from 'react'
import { Button, EmptyState, Spinner, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import { apiPlatformMeProjectInsights } from '@/lib/constants'
import type { CollectionProjectInsight } from '@/lib/collection-project-insight'
import { CollectionProjectCard } from '@/components/projects/CollectionProjectCard'
import { CreateCollectionProjectCard } from '@/components/projects/CreateCollectionProjectForm'

type InsightsMeta = {
  truncated: boolean
  shown: number
  totalAccessible: number
}

type CollectionProjectsListProps = {
  /** Controlled list — skips fetch when provided. */
  projects?: CollectionProjectInsight[]
  loading?: boolean
  error?: string | null
  meta?: InsightsMeta | null
  /** Cap cards (home preview). */
  limit?: number
  /** Bump to refetch when self-fetching. */
  refreshKey?: number
  onLoaded?: (projects: CollectionProjectInsight[], meta: InsightsMeta | null) => void
  /** Audion-style first-grid create card. */
  showCreateCard?: boolean
  onCreated?: (platformProjectId: string) => void
  /** Hub: show archive/restore and optional archived section. */
  enableLifecycle?: boolean
  /** Called after archive/restore so parent can bump refreshKey. */
  onLifecycleChange?: () => void
}

export function CollectionProjectsList({
  projects: controlledProjects,
  loading: controlledLoading,
  error: controlledError,
  meta: controlledMeta,
  limit,
  refreshKey = 0,
  onLoaded,
  showCreateCard = false,
  onCreated,
  enableLifecycle = false,
  onLifecycleChange,
}: CollectionProjectsListProps) {
  const { t } = useI18n()
  const controlled = controlledProjects !== undefined

  const [fetched, setFetched] = useState<CollectionProjectInsight[]>([])
  const [fetchLoading, setFetchLoading] = useState(!controlled)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [fetchMeta, setFetchMeta] = useState<InsightsMeta | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [archived, setArchived] = useState<CollectionProjectInsight[]>([])
  const [archivedLoading, setArchivedLoading] = useState(false)

  useEffect(() => {
    if (controlled) return
    let cancelled = false
    ;(async () => {
      setFetchLoading(true)
      setFetchError(null)
      try {
        const res = await fetch(apiPlatformMeProjectInsights(), { credentials: 'same-origin' })
        if (!res.ok) throw new Error(await res.text().catch(() => res.statusText))
        const data = (await res.json()) as {
          projects?: CollectionProjectInsight[]
          truncated?: boolean
          shown?: number
          totalAccessible?: number
        }
        const list = Array.isArray(data.projects) ? data.projects : []
        const meta: InsightsMeta | null =
          data.truncated && typeof data.shown === 'number' && typeof data.totalAccessible === 'number'
            ? {
                truncated: true,
                shown: data.shown,
                totalAccessible: data.totalAccessible,
              }
            : null
        if (cancelled) return
        setFetched(list)
        setFetchMeta(meta)
        onLoaded?.(list, meta)
      } catch (e) {
        if (!cancelled) {
          setFetchError(e instanceof Error ? e.message : t('projects.hub.loadError'))
          setFetched([])
          setFetchMeta(null)
        }
      } finally {
        if (!cancelled) setFetchLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [controlled, refreshKey, onLoaded, t])

  useEffect(() => {
    if (!enableLifecycle || !showArchived || controlled) return
    let cancelled = false
    ;(async () => {
      setArchivedLoading(true)
      try {
        const res = await fetch(apiPlatformMeProjectInsights({ includeArchived: true }), {
          credentials: 'same-origin',
        })
        if (!res.ok) throw new Error(await res.text().catch(() => res.statusText))
        const data = (await res.json()) as { projects?: CollectionProjectInsight[] }
        const list = Array.isArray(data.projects) ? data.projects : []
        if (!cancelled) setArchived(list)
      } catch {
        if (!cancelled) setArchived([])
      } finally {
        if (!cancelled) setArchivedLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enableLifecycle, showArchived, controlled, refreshKey])

  const loading = controlled ? Boolean(controlledLoading) : fetchLoading
  const error = controlled ? controlledError ?? null : fetchError
  const meta = controlled ? controlledMeta ?? null : fetchMeta
  const all = controlled ? controlledProjects : fetched
  const projects = typeof limit === 'number' ? all.slice(0, limit) : all

  if (loading) {
    return (
      <EmptyState className="plexon-collection-list-status">
        <Spinner size="sm" /> {t('common.loading')}
      </EmptyState>
    )
  }

  if (error) {
    return (
      <Text role="body" as="p" className="plexon-collection-list-error">
        {error}
      </Text>
    )
  }

  if (projects.length === 0 && !showCreateCard) {
    return (
      <EmptyState className="plexon-collection-list-status">
        {t('dashboard.platformInsightsEmpty')}
      </EmptyState>
    )
  }

  return (
    <div className="plexon-collection-list">
      {meta?.truncated ? (
        <Text role="meta" as="p" className="plexon-collection-list-truncated">
          {t('dashboard.platformInsightsTruncated', {
            shown: meta.shown,
            total: meta.totalAccessible,
          })}
        </Text>
      ) : null}
      <div className="plexon-collection-grid">
        {showCreateCard ? <CreateCollectionProjectCard onCreated={onCreated} /> : null}
        {projects.map((row) => (
          <CollectionProjectCard
            key={row.platformProject.id}
            row={row}
            onLifecycleChange={enableLifecycle ? onLifecycleChange : undefined}
          />
        ))}
      </div>
      {projects.length === 0 && showCreateCard ? (
        <EmptyState className="plexon-collection-list-status">
          {t('dashboard.platformInsightsEmpty')}
        </EmptyState>
      ) : null}

      {enableLifecycle ? (
        <div className="plexon-collection-archive-section">
          <Button variant="ghost" size="sm" onClick={() => setShowArchived((v) => !v)}>
            {showArchived
              ? t('projects.lifecycle.hideArchived')
              : t('projects.lifecycle.showArchived')}
          </Button>
          {showArchived ? (
            archivedLoading ? (
              <EmptyState className="plexon-collection-list-status">
                <Spinner size="sm" /> {t('common.loading')}
              </EmptyState>
            ) : archived.length === 0 ? (
              <EmptyState className="plexon-collection-list-status">
                {t('projects.lifecycle.archivedEmpty')}
              </EmptyState>
            ) : (
              <div className="plexon-collection-grid">
                {archived.map((row) => (
                  <CollectionProjectCard
                    key={`archived-${row.platformProject.id}`}
                    row={row}
                    onLifecycleChange={onLifecycleChange}
                  />
                ))}
              </div>
            )
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
