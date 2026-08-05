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
import {
  COLLECTION_FLOW_TEMPLATE_JOURNEY_QUALITY,
  COLLECTION_FLOW_TEMPLATE_JOURNEY_QUALITY_ISSUES,
  COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY,
  COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY_ISSUES,
} from '@/lib/collection-test-flow'
import type { CollectionTestFlowResponse } from '@/lib/db/collection-test-flows'

const CREATE_OPTIONS: Array<{ id: string; label: string }> = [
  { id: COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY, label: 'Page quality' },
  { id: COLLECTION_FLOW_TEMPLATE_JOURNEY_QUALITY, label: 'Journey + quality' },
  { id: COLLECTION_FLOW_TEMPLATE_PAGE_QUALITY_ISSUES, label: 'Page quality + issues' },
  {
    id: COLLECTION_FLOW_TEMPLATE_JOURNEY_QUALITY_ISSUES,
    label: 'Journey + quality + issues',
  },
]

export default function CollectionFlowsGalleryPage() {
  const params = useParams<{ platformProjectId: string }>()
  const platformProjectId = params.platformProjectId
  const [items, setItems] = useState<CollectionTestFlowResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')

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

  const create = useCallback(
    async (templateId: string) => {
      if (!platformProjectId) return
      setCreating(templateId)
      setError(null)
      const defaultName =
        CREATE_OPTIONS.find((o) => o.id === templateId)?.label ?? 'Page quality'
      try {
        const res = await fetch(apiPlatformProjectFlows(platformProjectId), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId,
            name: name.trim() || defaultName,
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
        setCreating(null)
      }
    },
    [name, platformProjectId, url]
  )

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
            Quality, journey, and issue-gate templates (Wave 3)
          </Text>
        </div>
      </header>

      <section className="plexon-flow-gallery-create" aria-label="Create flow">
        <Field label="Name (optional)">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Flow name"
          />
        </Field>
        <Field label="URL (optional — defaults to Collection domain)">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
          />
        </Field>
        <div className="plexon-flow-gallery-actions">
          {CREATE_OPTIONS.map((opt, i) => (
            <Button
              key={opt.id}
              variant={i === 0 ? 'primary' : 'ghost'}
              size="md"
              disabled={Boolean(creating)}
              onClick={() => void create(opt.id)}
            >
              {creating === opt.id ? (
                <>
                  <Spinner size="sm" /> Creating…
                </>
              ) : (
                `Create ${opt.label}`
              )}
            </Button>
          ))}
        </div>
      </section>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {loading ? (
        <Text role="meta">
          <Spinner size="sm" /> Loading…
        </Text>
      ) : items.length === 0 ? (
        <EmptyState>No flows yet — create a template above.</EmptyState>
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
                  {item.templateId ?? item.flow.templateId}
                  {' · '}
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
