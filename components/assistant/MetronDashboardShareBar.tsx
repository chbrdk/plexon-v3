'use client'

import { useCallback, useState } from 'react'
import { Button, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import type { MetronDashboardShareSnapshot } from '@/lib/assistant/ui-blocks/types'
import { apiAssistantMetronDashboardShare } from '@/lib/constants'

type Props = {
  snapshot: MetronDashboardShareSnapshot
}

/** One-click public share for METRON Auto-UI (EQC clipboard pattern). */
export function MetronDashboardShareBar({ snapshot }: Props) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const share = useCallback(async () => {
    if (!snapshot.metrics.length && !snapshot.chart) return
    setBusy(true)
    setFeedback(null)
    try {
      const res = await fetch(apiAssistantMetronDashboardShare(), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? t('assistant.metron.shareLinkError'))
      }
      const absolute =
        typeof window !== 'undefined'
          ? new URL(data.url, window.location.origin).toString()
          : data.url
      await navigator.clipboard.writeText(absolute)
      setFeedback(t('assistant.metron.shareLinkCopied'))
      window.setTimeout(() => setFeedback(null), 2500)
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : t('assistant.metron.shareLinkError'))
      window.setTimeout(() => setFeedback(null), 3500)
    } finally {
      setBusy(false)
    }
  }, [snapshot, t])

  if (!snapshot.metrics.length && !snapshot.chart) return null

  return (
    <div className="plexon-metron-share-bar" data-testid="metron-dashboard-share-bar">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={() => void share()}
      >
        {busy ? t('assistant.metron.shareLinkBusy') : t('assistant.metron.shareLink')}
      </Button>
      {feedback ? (
        <Text role="meta" as="span">
          {feedback}
        </Text>
      ) : null}
    </div>
  )
}
