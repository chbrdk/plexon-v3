'use client'

import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, SectionChrome, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import { apiPlatformProjectMcpHubServers } from '@/lib/constants'

type HubServerToggle = {
  serverId: string
  slug: string
  displayName: string
  status: string
  authKind: string
  enabled: boolean
  overridden: boolean
}

export function CollectionMcpHubPanel({ platformProjectId }: { platformProjectId: string }) {
  const { t } = useI18n()
  const [items, setItems] = useState<HubServerToggle[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [forbidden, setForbidden] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch(apiPlatformProjectMcpHubServers(platformProjectId), {
        credentials: 'same-origin',
      })
      if (res.status === 403) {
        setForbidden(true)
        setItems([])
        return
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : t('projects.mcpHubLoadError'))
        return
      }
      setForbidden(false)
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch {
      setError(t('projects.mcpHubLoadError'))
    }
  }, [platformProjectId, t])

  useEffect(() => {
    void load()
  }, [load])

  const toggle = async (item: HubServerToggle) => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(apiPlatformProjectMcpHubServers(platformProjectId), {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId: item.serverId, enabled: !item.enabled }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : t('projects.mcpHubSaveError'))
        return
      }
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch {
      setError(t('projects.mcpHubSaveError'))
    } finally {
      setBusy(false)
    }
  }

  if (forbidden) return null

  return (
    <section className="plexon-settings-section" aria-label={t('projects.mcpHubTitle')}>
      <SectionChrome
        title={t('projects.mcpHubTitle')}
        meta={<Text role="meta">{t('projects.mcpHubHint')}</Text>}
      />
      {error ? <Alert tone="error">{error}</Alert> : null}
      {items.length === 0 ? (
        <Text role="meta">{t('projects.mcpHubEmpty')}</Text>
      ) : (
        <table className="plexon-admin-table">
          <thead>
            <tr>
              <th>{t('projects.mcpHubColEnabled')}</th>
              <th>{t('admin.mcpHubColName')}</th>
              <th>{t('admin.mcpHubColSlug')}</th>
              <th>{t('admin.mcpHubColStatus')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.serverId}>
                <td>
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    disabled={busy}
                    onChange={() => void toggle(item)}
                    aria-label={item.displayName}
                  />
                </td>
                <td>{item.displayName}</td>
                <td>
                  <code>{item.slug}</code>
                </td>
                <td>
                  {item.status}
                  {item.overridden ? (
                    <Text role="meta"> · {t('projects.mcpHubOverridden')}</Text>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="plexon-settings-actions">
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => void load()}>
          {t('projects.mcpHubReload')}
        </Button>
      </div>
    </section>
  )
}
