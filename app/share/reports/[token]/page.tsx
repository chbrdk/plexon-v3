'use client'

import { useEffect, useState } from 'react'
import { Spinner, Text } from '@msqdx/ui'
import { apiPublicReport } from '@/lib/constants'
import { PublicReportView } from '@/components/assistant/PublicReportView'
import type { UiLayout } from '@/lib/assistant/ui-blocks/types'

export default function ShareReportPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<{
    title: string
    narrative: { intro?: string; fazit?: string }
    uiLayout: UiLayout
  } | null>(null)

  useEffect(() => {
    void params.then((p) => setToken(p.token))
  }, [params])

  useEffect(() => {
    if (!token) return
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(apiPublicReport(token))
        if (!res.ok) throw new Error('Report not found')
        const data = (await res.json()) as {
          title: string
          narrative: { intro?: string; fazit?: string }
          uiLayout: UiLayout
        }
        setReport(data)
      } catch {
        setError('Dieser Report ist nicht verfügbar.')
      } finally {
        setLoading(false)
      }
    })()
  }, [token])

  if (loading) {
    return (
      <div className="plexon-public-report-state">
        <Spinner size="md" />
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="plexon-public-report-state">
        <Text role="title">{error ?? 'Nicht gefunden'}</Text>
      </div>
    )
  }

  return (
    <PublicReportView title={report.title} shareToken={token ?? undefined} uiLayout={report.uiLayout} />
  )
}
