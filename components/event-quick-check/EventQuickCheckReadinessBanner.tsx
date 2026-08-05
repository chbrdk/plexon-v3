'use client'

import { useEffect, useState } from 'react'
import { Alert, Text } from '@msqdx/ui'
import { API_EVENT_QUICK_CHECK_READINESS } from '@/lib/paths/event-quick-check-page'
import { EQC_PAGE_COPY } from '@/lib/assistant/event-quick-check/event-quick-check-page-copy'

type ReadinessPayload = {
  ready: boolean
  blockers: string[]
  checkion?: { apiUrlPrefix?: string }
  audion?: { webOriginPrefix?: string }
}

/**
 * Warns when CHECKION/AUDION service env is missing so Quick Check does not look “gone”.
 */
export function EventQuickCheckReadinessBanner() {
  const [payload, setPayload] = useState<ReadinessPayload | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(API_EVENT_QUICK_CHECK_READINESS, { credentials: 'same-origin' })
        if (!res.ok) return
        const json = (await res.json()) as ReadinessPayload
        if (!cancelled) setPayload(json)
      } catch {
        /* banner is best-effort */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!payload || payload.ready) return null

  return (
    <Alert tone="warning" className="plexon-eqc-readiness">
      <Text role="title" as="p">
        {EQC_PAGE_COPY.readinessTitle}
      </Text>
      <Text role="body" as="p">
        {EQC_PAGE_COPY.readinessLead}
      </Text>
      <ul className="plexon-eqc-readiness-list">
        {payload.blockers.map((b) => (
          <li key={b}>
            <Text role="meta">{b}</Text>
          </li>
        ))}
      </ul>
      <Text role="meta" as="p">
        {EQC_PAGE_COPY.readinessOpsHint}
      </Text>
    </Alert>
  )
}
