'use client'

import { useEffect, useState } from 'react'
import { Alert, Spinner, Text } from '@msqdx/ui'
import { EventQuickCheckDashboardView } from '@/components/event-quick-check/EventQuickCheckDashboardView'
import type { EventQuickCheckReportModel } from '@/lib/assistant/reports/event-quick-check-report-types'
import {
  apiPublicQuickCheck,
  apiPublicQuickCheckPdf,
  apiPublicQuickCheckPptx,
} from '@/lib/constants'
import { EQC_PAGE_COPY } from '@/lib/assistant/event-quick-check/event-quick-check-page-copy'

export default function ShareQuickCheckPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<EventQuickCheckReportModel | null>(null)
  const [runId, setRunId] = useState('shared')

  useEffect(() => {
    void params.then((p) => setToken(p.token))
  }, [params])

  useEffect(() => {
    if (!token) return
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(apiPublicQuickCheck(token))
        if (!res.ok) throw new Error('not found')
        const data = (await res.json()) as {
          report: EventQuickCheckReportModel
          runId?: string
        }
        setReport(data.report)
        if (data.runId) setRunId(data.runId)
      } catch {
        setError('Dieser Quick Check ist nicht verfügbar.')
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

  if (error || !report) {
    return (
      <div className="plexon-eqc-center" style={{ minHeight: '40vh', padding: '2rem' }}>
        <Alert tone="error">{error ?? 'Nicht gefunden'}</Alert>
        <Text role="meta">{EQC_PAGE_COPY.sharePublicReadOnly}</Text>
      </div>
    )
  }

  return (
    <main className="plexon-eqc-share-page">
      <EventQuickCheckDashboardView
        report={report}
        workflowRunId={runId}
        platformProjectId={report.meta.platformProjectId}
        readOnly
        pdfUrl={apiPublicQuickCheckPdf(token)}
        pptxUrl={apiPublicQuickCheckPptx(token)}
      />
    </main>
  )
}
