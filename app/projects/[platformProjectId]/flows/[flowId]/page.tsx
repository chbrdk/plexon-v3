'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Alert, Spinner, Text } from '@msqdx/ui'
import { apiPlatformProjectFlow } from '@/lib/constants'
import type { CollectionTestFlowResponse } from '@/lib/db/collection-test-flows'
import { CollectionFlowBoard } from '@/components/flows/CollectionFlowBoard'

export default function CollectionFlowBoardPage() {
  const params = useParams<{ platformProjectId: string; flowId: string }>()
  const platformProjectId = params.platformProjectId
  const flowId = params.flowId
  const [flow, setFlow] = useState<CollectionTestFlowResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!platformProjectId || !flowId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiPlatformProjectFlow(platformProjectId, flowId))
      const json = (await res.json().catch(() => null)) as
        | CollectionTestFlowResponse
        | { error?: string }
        | null
      if (!res.ok) {
        throw new Error(
          json && 'error' in json && json.error
            ? json.error
            : `Load failed (${res.status})`
        )
      }
      setFlow(json as CollectionTestFlowResponse)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [flowId, platformProjectId])

  useEffect(() => {
    void load()
  }, [load])

  if (!platformProjectId || !flowId) {
    return (
      <div className="plexon-magazine">
        <Text role="meta">Missing ids</Text>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="plexon-flow-board-loading">
        <Spinner size="md" />
        <Text role="meta">Loading flow…</Text>
      </div>
    )
  }

  if (error || !flow) {
    return (
      <div className="plexon-magazine">
        <Alert tone="error">{error || 'Not found'}</Alert>
      </div>
    )
  }

  return <CollectionFlowBoard platformProjectId={platformProjectId} initial={flow} />
}
