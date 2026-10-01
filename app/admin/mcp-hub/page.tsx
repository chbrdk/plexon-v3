'use client'

import { useCallback, useEffect, useState } from 'react'
import NextLink from 'next/link'
import { Button, SectionChrome, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import {
  API_ADMIN_MCP_SERVERS,
  API_ADMIN_MCP_SERVERS_BOOTSTRAP,
  PATH_ADMIN_MCP_HUB,
  pathAdminMcpHubServer,
} from '@/lib/constants'

type HubServer = {
  id: string
  slug: string
  displayName: string
  baseUrl: string
  status: string
  authKind: string
  toolCount?: number
  lastError?: string | null
}

export default function AdminMcpHubPage() {
  const { t } = useI18n()
  const [items, setItems] = useState<HubServer[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [slug, setSlug] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [authKind, setAuthKind] = useState('none')
  const [bearerEnvKey, setBearerEnvKey] = useState('')

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch(API_ADMIN_MCP_SERVERS, { credentials: 'same-origin' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : t('admin.mcpHubLoadError'))
        return
      }
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch {
      setError(t('admin.mcpHubLoadError'))
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(API_ADMIN_MCP_SERVERS, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          displayName: displayName || slug,
          baseUrl,
          authKind,
          authConfig:
            authKind === 'service_bearer' && bearerEnvKey.trim()
              ? { bearerEnvKey: bearerEnvKey.trim() }
              : {},
          status: 'draft',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : t('admin.mcpHubCreateError'))
        return
      }
      setSlug('')
      setDisplayName('')
      setBaseUrl('')
      setBearerEnvKey('')
      await load()
    } catch {
      setError(t('admin.mcpHubCreateError'))
    } finally {
      setBusy(false)
    }
  }

  const onBootstrap = async (kind: 'audion' | 'canva' | 'all' = 'all') => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(API_ADMIN_MCP_SERVERS_BOOTSTRAP, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : t('admin.mcpHubBootstrapError'))
        return
      }
      await load()
    } catch {
      setError(t('admin.mcpHubBootstrapError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="plexon-admin-stack">
      <section className="plexon-settings-section" aria-label={t('admin.mcpHubTitle')}>
        <SectionChrome
          title={t('admin.mcpHubTitle')}
          meta={<Text role="meta">{t('admin.mcpHubIntro')}</Text>}
        />
        {error ? (
          <Text role="meta" className="plexon-admin-error">
            {error}
          </Text>
        ) : null}
        <div className="plexon-settings-actions">
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => void onBootstrap('audion')}
          >
            {t('admin.mcpHubBootstrap')}
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => void onBootstrap('canva')}
          >
            {t('admin.mcpHubBootstrapCanva')}
          </Button>
        </div>
        <table className="plexon-admin-table">
          <thead>
            <tr>
              <th>{t('admin.mcpHubColName')}</th>
              <th>{t('admin.mcpHubColSlug')}</th>
              <th>{t('admin.mcpHubColStatus')}</th>
              <th>{t('admin.mcpHubColTools')}</th>
              <th>{t('admin.mcpHubColUrl')}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <Text role="meta">{t('admin.mcpHubEmpty')}</Text>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <NextLink href={pathAdminMcpHubServer(item.id)} className="plexon-admin-link">
                      {item.displayName}
                    </NextLink>
                  </td>
                  <td>
                    <code>{item.slug}</code>
                  </td>
                  <td>{item.status}</td>
                  <td>{item.toolCount ?? 0}</td>
                  <td>
                    <Text role="meta" className="plexon-admin-mono">
                      {item.baseUrl}
                    </Text>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="plexon-settings-section" aria-label={t('admin.mcpHubCreateTitle')}>
        <SectionChrome title={t('admin.mcpHubCreateTitle')} />
        <form className="plexon-settings-actions" onSubmit={onCreate}>
          <label>
            <Text role="meta">slug</Text>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="canva"
              required
            />
          </label>
          <label>
            <Text role="meta">{t('admin.mcpHubColName')}</Text>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Canva"
            />
          </label>
          <label>
            <Text role="meta">baseUrl</Text>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://…"
              required
            />
          </label>
          <label>
            <Text role="meta">authKind</Text>
            <select value={authKind} onChange={(e) => setAuthKind(e.target.value)}>
              <option value="none">none</option>
              <option value="service_bearer">service_bearer</option>
              <option value="service_secret_headers">service_secret_headers</option>
            </select>
          </label>
          {authKind === 'service_bearer' ? (
            <label>
              <Text role="meta">bearerEnvKey</Text>
              <input
                value={bearerEnvKey}
                onChange={(e) => setBearerEnvKey(e.target.value)}
                placeholder="AUDION_API_TOKEN"
              />
            </label>
          ) : null}
          <Button type="submit" variant="primary" disabled={busy}>
            {t('admin.mcpHubCreate')}
          </Button>
          <NextLink href={PATH_ADMIN_MCP_HUB}>
            <Button type="button" variant="ghost">
              {t('common.cancel')}
            </Button>
          </NextLink>
        </form>
      </section>
    </div>
  )
}
