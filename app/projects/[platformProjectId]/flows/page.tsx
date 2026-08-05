'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Alert, Button, EmptyState, Field, Input, Spinner, Text } from '@msqdx/ui'
import {
  apiPlatformProjectFlows,
  pathPlatformProjectDashboard,
  pathPlatformProjectFlow,
} from '@/lib/constants'
import type { CollectionTestFlowResponse } from '@/lib/db/collection-test-flows'

export default function CollectionFlowsGalleryPage() {
  const params = useParams<{ platformProjectId: string }>()
  const platformProjectId = params.platformProjectId
  const [items, setItems] = useState<CollectionTestFlowResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [name, setName] = useState('Page quality')

  const load = useCallback(async () => {
    if (!platformProjectId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiPlatformProjectFlows(platformProjectId))
      const json = (await res.json().catch(() => null)) as {
        items?: CollectionTestFlowResponse[]
        error?: string
      } | null
      if (!res.ok) throw new Error(json?.error || `Load failed (${res.status})`)
      setItems(json?.items ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [platformProjectId])

  useEffect(() => {
    void load()
  }, [load])

  const create = useCallback(async () => {
    if (!platformProjectId) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch(apiPlatformProjectFlows(platformProjectId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || 'Page quality',
          ...(url.trim() ? { url: url.trim() } : {}),
        }),
      })
      const json = (await res.json().catch(() => null)) as
        | CollectionTestFlowResponse
        | { error?: string }
        | null
      if (!res.ok) {
        throw new Error(
          json && 'error' in json && json.error
            ? json.error
            : `Create failed (${res.status})`
        )
      }
      const created = json as CollectionTestFlowResponse
      window.location.href = pathPlatformProjectFlow(platformProjectId, created.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setCreating(false)
    }
  }, [name, platformProjectId, url])

  if (!platformProjectId) {
    return (
      <div className="plexon-magazine">
        <Text role="meta">Missing project id</Text>
      </div>
    )
  }

  return (
    <div className="plexon-magazine plexon-flow-gallery">
      <header className="plexon-flow-gallery-head">
        <div>
          <Link
            href={pathPlatformProjectDashboard(platformProjectId)}
            className="plexon-flow-back"
          >
            ← Collection
          </Link>
          <Text role="title" as="h1">
            Test Flows
          </Text>
          <Text role="meta" as="p">
            Wave 1 quality path — start → scan → score gate → verdict
          </Text>
        </div>
      </header>

      <section className="plexon-flow-gallery-create" aria-label="Create flow">
        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Page quality"
          />
        </Field>
        <Field label="URL (optional — defaults to Collection domain)">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
          />
        </Field>
        <Button variant="primary" size="md" disabled={creating} onClick={() => void create()}>
          {creating ? (
            <>
              <Spinner size="sm" /> Creating…
            </>
          ) : (
            'Create page-quality flow'
          )}
        </Button>
      </section>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {loading ? (
        <Text role="meta">
          <Spinner size="sm" /> Loading…
        </Text>
      ) : items.length === 0 ? (
        <EmptyState>No flows yet — create a page-quality template.</EmptyState>
      ) : (
        <ul className="plexon-flow-gallery-list">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={pathPlatformProjectFlow(platformProjectId, item.id)}
                className="plexon-flow-gallery-item"
              >
                <Text role="title" as="span">
                  {item.name}
                </Text>
                <Text role="meta" as="span">
                  {item.flow.lastVerdict
                    ? item.flow.lastVerdict.collectionReady
                      ? 'ready'
                      : item.flow.lastVerdict.summary
                    : 'not run'}
                  {' · '}
                  {new Date(item.updatedAt).toLocaleString()}
                </Text>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
