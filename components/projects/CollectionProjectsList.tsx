'use client'

import { useEffect, useState } from 'react'
import { EmptyState, Spinner, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import { API_PLATFORM_ME_PROJECT_INSIGHTS } from '@/lib/constants'
import type { CollectionProjectInsight } from '@/lib/collection-project-insight'
import { CollectionProjectCard } from '@/components/projects/CollectionProjectCard'

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
}

export function CollectionProjectsList({
  projects: controlledProjects,
  loading: controlledLoading,
  error: controlledError,
  meta: controlledMeta,
  limit,
  refreshKey = 0,
  onLoaded,
}: CollectionProjectsListProps) {
  const { t } = useI18n()
  const controlled = controlledProjects !== undefined

  const [fetched, setFetched] = useState<CollectionProjectInsight[]>([])
  const [fetchLoading, setFetchLoading] = useState(!controlled)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [fetchMeta, setFetchMeta] = useState<InsightsMeta | null>(null)

  useEffect(() => {
    if (controlled) return
    let cancelled = false
    ;(async () => {
      setFetchLoading(true)
      setFetchError(null)
      try {
        const res = await fetch(API_PLATFORM_ME_PROJECT_INSIGHTS, { credentials: 'same-origin' })
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

  if (projects.length === 0) {
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
        {projects.map((row) => (
          <CollectionProjectCard key={row.platformProject.id} row={row} />
        ))}
      </div>
    </div>
  )
}
