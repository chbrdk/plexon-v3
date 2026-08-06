'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button, Chip, RankedList, RankedRow, Text } from '@msqdx/ui'
import { apiPlatformProjectFlowRuns } from '@/lib/constants'
import type { CollectionFlowRunResponse } from '@/lib/db/collection-flow-runs'

type Props = {
  platformProjectId: string
  flowId: string
  selectedRunId: string | null
  /** Bump to reload (e.g. after Testen finishes). */
  refreshKey?: number
  onSelect: (run: CollectionFlowRunResponse | null) => void
  /** Wave 22: fresh Testen on current doc (does not replay past verdict). */
  onRerun?: () => void
  onClose?: () => void
}

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function summaryLine(run: CollectionFlowRunResponse): string {
  if (run.error) return run.error.slice(0, 80)
  const v = run.verdict
  const lr = run.lastRun
  const parts = [
    run.status,
    v?.collectionReady === true ? 'ready' : v?.collectionReady === false ? 'not ready' : null,
    lr?.overallScore != null ? `score ${lr.overallScore}` : null,
  ]
  return parts.filter(Boolean).join(' · ') || '—'
}

export function CollectionFlowHistoryPanel({
  platformProjectId,
  flowId,
  selectedRunId,
  refreshKey = 0,
  onSelect,
  onRerun,
  onClose,
}: Props) {
  const [items, setItems] = useState<CollectionFlowRunResponse[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(`${apiPlatformProjectFlowRuns(platformProjectId, flowId)}?limit=50`)
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        items?: CollectionFlowRunResponse[]
      }
      if (!res.ok) {
        setMsg(data.error || `Laden fehlgeschlagen (${res.status})`)
        return
      }
      setItems(data.items ?? [])
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [platformProjectId, flowId])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  return (
    <div className="plexon-flow-history">
      <div className="plexon-flow-history__toolbar">
        <Button type="button" size="sm" variant="subtle" onClick={() => onSelect(null)}>
          Aktuell
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => void load()} disabled={busy}>
          Aktualisieren
        </Button>
        {onRerun && selectedRunId ? (
          <Button type="button" size="sm" variant="subtle" onClick={() => onRerun()}>
            Erneut ausführen
          </Button>
        ) : null}
        {onClose ? (
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>
            Schließen
          </Button>
        ) : null}
      </div>
      {msg ? (
        <Text role="meta" as="p">
          {msg}
        </Text>
      ) : null}
      {busy && items.length === 0 ? (
        <Text role="meta" as="p">
          Lädt…
        </Text>
      ) : null}
      {!busy && items.length === 0 ? (
        <Text role="meta" as="p">
          Noch keine Läufe.
        </Text>
      ) : null}
      {items.length > 0 ? (
        <RankedList hint="Neueste zuerst · Auswahl malt Verdict (ohne Re-Run)">
          {items.map((run, i) => (
            <RankedRow
              key={run.id}
              index={i + 1}
              active={selectedRunId === run.id}
              onActivate={() => onSelect(run)}
              label={
                <span className="plexon-flow-history__label">
                  <span>{formatWhen(run.createdAt)}</span>
                  <Chip size="sm" static>
                    {run.trigger}
                  </Chip>
                </span>
              }
              value={run.status}
              secondary={summaryLine(run)}
            />
          ))}
        </RankedList>
      ) : null}
    </div>
  )
}
