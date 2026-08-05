'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button, Text } from '@msqdx/ui'
import {
  apiPlatformProjectFlow,
  apiPlatformProjectFlowTriggerWebhook,
  apiPlatformProjectFlowWebhookRotate,
} from '@/lib/constants'

type Props = {
  platformProjectId: string
  flowId: string
  webhookEnabled: boolean
  webhookSecretHint: string | null
  onUpdated?: (next: { webhookEnabled: boolean; webhookSecretHint: string | null }) => void
}

export function CollectionFlowWebhookPanel({
  platformProjectId,
  flowId,
  webhookEnabled,
  webhookSecretHint,
  onUpdated,
}: Props) {
  const [enabled, setEnabled] = useState(webhookEnabled)
  const [hint, setHint] = useState(webhookSecretHint)
  const [secretOnce, setSecretOnce] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    setEnabled(webhookEnabled)
    setHint(webhookSecretHint)
  }, [webhookEnabled, webhookSecretHint])

  const triggerPath = apiPlatformProjectFlowTriggerWebhook(platformProjectId, flowId)
  const absoluteHint =
    typeof window !== 'undefined' ? `${window.location.origin}${triggerPath}` : triggerPath

  const rotate = useCallback(async () => {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(apiPlatformProjectFlowWebhookRotate(platformProjectId, flowId), {
        method: 'POST',
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        webhookSecret?: string
        hint?: string
        flow?: { webhookEnabled?: boolean; webhookSecretHint?: string | null }
      }
      if (!res.ok) {
        setMsg(data.error || 'Rotate fehlgeschlagen')
        return
      }
      setSecretOnce(data.webhookSecret ?? null)
      setEnabled(true)
      setHint(data.hint ?? data.flow?.webhookSecretHint ?? null)
      onUpdated?.({
        webhookEnabled: true,
        webhookSecretHint: data.hint ?? data.flow?.webhookSecretHint ?? null,
      })
      setMsg('Secret erstellt — jetzt kopieren (wird nicht erneut angezeigt).')
    } finally {
      setBusy(false)
    }
  }, [platformProjectId, flowId, onUpdated])

  const toggleEnabled = useCallback(
    async (next: boolean) => {
      setBusy(true)
      setMsg(null)
      try {
        const res = await fetch(apiPlatformProjectFlow(platformProjectId, flowId), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ webhookEnabled: next }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          webhookEnabled?: boolean
          webhookSecretHint?: string | null
        }
        if (!res.ok) {
          setMsg(data.error || 'Speichern fehlgeschlagen')
          return
        }
        setEnabled(Boolean(data.webhookEnabled ?? next))
        onUpdated?.({
          webhookEnabled: Boolean(data.webhookEnabled ?? next),
          webhookSecretHint: data.webhookSecretHint ?? hint,
        })
      } finally {
        setBusy(false)
      }
    },
    [platformProjectId, flowId, hint, onUpdated]
  )

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setMsg('Kopiert.')
    } catch {
      setMsg('Kopieren nicht möglich.')
    }
  }, [])

  const curlExample = secretOnce
    ? `curl -X POST '${absoluteHint}' \\\n  -H 'Authorization: Bearer ${secretOnce}' \\\n  -H 'Content-Type: application/json' \\\n  -d '{}'`
    : `curl -X POST '${absoluteHint}' \\\n  -H 'Authorization: Bearer whsec_…' \\\n  -H 'Content-Type: application/json' \\\n  -d '{}'`

  return (
    <div className="msqdx-flow-webhook-panel" style={{ display: 'grid', gap: 8, minWidth: 280 }}>
      <Text as="p" role="label">
        Webhook
      </Text>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="checkbox"
          checked={enabled}
          disabled={busy || (!hint && !secretOnce)}
          onChange={(e) => void toggleEnabled(e.target.checked)}
        />
        <Text as="span" role="meta">
          Aktiv{hint ? ` (…${hint})` : ''}
        </Text>
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Button type="button" size="sm" disabled={busy} onClick={() => void rotate()}>
          Secret rotieren
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => void copy(absoluteHint)}>
          URL kopieren
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => void copy(curlExample)}>
          curl kopieren
        </Button>
      </div>
      {secretOnce ? (
        <Text as="p" role="hint" style={{ wordBreak: 'break-all' }}>
          Secret (einmal): {secretOnce}
        </Text>
      ) : null}
      {msg ? (
        <Text as="p" role="hint">
          {msg}
        </Text>
      ) : null}
    </div>
  )
}
