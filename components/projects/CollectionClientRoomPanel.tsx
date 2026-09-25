'use client'

/**
 * ClientRoom management on Collection home (Enterprise E2).
 */

import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Chip, Spinner, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import { apiPlatformProvisioningCollectionClientRoom } from '@/lib/constants'
import type { ClientRoomSlots } from '@/lib/db/schema'

type Room = {
  id: string
  revision: number
  expiresAt: string | null
  slots: ClientRoomSlots
  createdAt: string
}

export function CollectionClientRoomPanel({ platformProjectId }: { platformProjectId: string }) {
  const { t } = useI18n()
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [url, setUrl] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiPlatformProvisioningCollectionClientRoom(platformProjectId), {
        credentials: 'same-origin',
      })
      if (!res.ok) throw new Error(await res.text())
      const json = (await res.json()) as { room: Room | null }
      setRoom(json.room)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('projects.detail.clientRoomLoadError'))
    } finally {
      setLoading(false)
    }
  }, [platformProjectId, t])

  useEffect(() => {
    void load()
  }, [load])

  async function createRoom() {
    setBusy(true)
    setError(null)
    setUrl(null)
    try {
      const res = await fetch(apiPlatformProvisioningCollectionClientRoom(platformProjectId), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresInDays: 30 }),
      })
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        room?: Room
        url?: string
      }
      if (!res.ok) throw new Error(body.error || res.statusText)
      setRoom(body.room ?? null)
      setUrl(body.url ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('projects.detail.clientRoomCreateError'))
    } finally {
      setBusy(false)
    }
  }

  async function revoke() {
    if (!window.confirm(t('projects.detail.clientRoomRevokeConfirm'))) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(apiPlatformProvisioningCollectionClientRoom(platformProjectId), {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      if (!res.ok) throw new Error(await res.text())
      setRoom(null)
      setUrl(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('projects.detail.clientRoomRevokeError'))
    } finally {
      setBusy(false)
    }
  }

  const slotEntries = room
    ? Object.entries(room.slots).filter(([, v]) => v != null)
    : []

  return (
    <section
      className="plexon-dash-band"
      data-section="collection-client-room"
      data-testid="collection-client-room-panel"
      aria-label={t('projects.detail.clientRoomTitle')}
    >
      <header className="plexon-dash-band-head">
        <div>
          <Text role="headline" as="h2">
            {t('projects.detail.clientRoomTitle')}
          </Text>
          <Text role="meta" as="p">
            {t('projects.detail.clientRoomSubtitle')}
          </Text>
        </div>
        <div className="plexon-project-detail-actions">
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => void createRoom()}>
            {room
              ? t('projects.detail.clientRoomRotate')
              : t('projects.detail.clientRoomCreate')}
          </Button>
          {room ? (
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => void revoke()}>
              {t('projects.detail.clientRoomRevoke')}
            </Button>
          ) : null}
        </div>
      </header>

      {loading ? (
        <Text role="meta">
          <Spinner size="sm" /> {t('common.loading')}
        </Text>
      ) : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      {url ? (
        <Alert tone="success">
          {t('projects.detail.clientRoomLink')}: {url}
        </Alert>
      ) : null}

      {!loading && !room ? (
        <Text role="meta">{t('projects.detail.clientRoomEmpty')}</Text>
      ) : null}

      {room ? (
        <>
          <Text role="meta">
            rev {room.revision}
            {room.expiresAt
              ? ` · ${t('projects.detail.clientShares.expires')} ${new Date(room.expiresAt).toLocaleDateString()}`
              : ''}
          </Text>
          {slotEntries.length === 0 ? (
            <Text role="meta">{t('projects.detail.clientRoomSlotsEmpty')}</Text>
          ) : (
            <ul className="plexon-project-bindings">
              {slotEntries.map(([slotId, slot]) => (
                <li key={slotId} className="plexon-project-binding">
                  <div className="plexon-project-binding__main">
                    <Text role="title" as="h4">
                      {slot!.title}
                    </Text>
                    <Text role="meta">
                      {slotId} · {slot!.productId}
                    </Text>
                  </div>
                  <Chip static size="sm">
                    {t('projects.detail.clientRoomApproved')}
                  </Chip>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </section>
  )
}
