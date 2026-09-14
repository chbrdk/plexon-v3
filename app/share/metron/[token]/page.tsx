'use client'

import { useEffect, useState } from 'react'
import { Alert, Spinner, Text } from '@msqdx/ui'
import { MetronShareMagazine } from '@/components/assistant/MetronShareMagazine'
import { buildMetronShareUiLayout } from '@/lib/assistant/ui-blocks/build-metron-dashboard-ui'
import type { MetronDashboardShareSnapshot } from '@/lib/assistant/ui-blocks/types'
import { apiPublicMetron, pathShareMetron } from '@/lib/constants'

export default function ShareMetronPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<MetronDashboardShareSnapshot | null>(null)
  const [createdAt, setCreatedAt] = useState<string | null>(null)

  useEffect(() => {
    void params.then((p) => setToken(p.token))
  }, [params])

  useEffect(() => {
    if (!token) return
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(apiPublicMetron(token))
        if (!res.ok) throw new Error('not found')
        const data = (await res.json()) as {
          report?: MetronDashboardShareSnapshot
          createdAt?: string
        }
        if (!data.report?.dashboardId) throw new Error('not found')
        setSnapshot(data.report)
        setCreatedAt(typeof data.createdAt === 'string' ? data.createdAt : null)
      } catch {
        setError('Dieser METRON-Report ist nicht verfügbar.')
      } finally {
        setLoading(false)
      }
    })()
  }, [token])

  if (loading || !token) {
    return (
      <div className="plexon-eqc-center" style={{ minHeight: '40vh' }}>
        <Spinner size="md" />
      </div>
    )
  }

  if (error || !snapshot) {
    return (
      <div className="plexon-eqc-center" style={{ minHeight: '40vh', padding: '2rem' }}>
        <Alert tone="error">{error ?? 'Nicht gefunden'}</Alert>
        <Text role="meta">Öffentlicher METRON-Snapshot — nur Lesen.</Text>
      </div>
    )
  }

  const layout = buildMetronShareUiLayout(snapshot)
  const shareUrl =
    typeof window !== 'undefined'
      ? new URL(pathShareMetron(token), window.location.origin).toString()
      : pathShareMetron(token)

  return (
    <MetronShareMagazine
      snapshot={snapshot}
      layout={layout}
      createdAt={createdAt}
      shareUrl={shareUrl}
    />
  )
}
