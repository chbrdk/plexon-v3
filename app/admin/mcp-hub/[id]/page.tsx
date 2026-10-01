'use client'

import { useCallback, useEffect, useState } from 'react'
import NextLink from 'next/link'
import { useParams } from 'next/navigation'
import { Button, SectionChrome, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import {
  PATH_ADMIN_MCP_HUB,
  apiAdminMcpServer,
  apiAdminMcpServerDiscover,
  apiAdminMcpServerPolicies,
  apiAdminMcpServerTest,
  apiAdminMcpServerTool,
} from '@/lib/constants'

type HubTool = {
  id: string
  mcpName: string
  exposedName: string
  description: string | null
  sideEffect: string
  enabled: boolean
  requireConfirm: boolean
  capabilityId: string | null
}

type HubServer = {
  id: string
  slug: string
  displayName: string
  baseUrl: string
  status: string
  authKind: string
  lastError?: string | null
  lastDiscoveryAt?: string | null
  routingHints?: string[]
}

type HubPolicy = {
  id: string
  effect: string
  allowWrite: boolean
  toolId: string | null
}

export default function AdminMcpHubServerPage() {
  const { t } = useI18n()
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : ''
  const [item, setItem] = useState<HubServer | null>(null)
  const [tools, setTools] = useState<HubTool[]>([])
  const [policy, setPolicy] = useState<HubPolicy | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('draft')
  const [routingHintsText, setRoutingHintsText] = useState('')
  const [orgEffect, setOrgEffect] = useState<'allow' | 'deny'>('allow')
  const [orgAllowWrite, setOrgAllowWrite] = useState(true)

  const load = useCallback(async () => {
    if (!id) return
    setError(null)
    try {
      const [serverRes, policyRes] = await Promise.all([
        fetch(apiAdminMcpServer(id), { credentials: 'same-origin' }),
        fetch(apiAdminMcpServerPolicies(id), { credentials: 'same-origin' }),
      ])
      const data = await serverRes.json().catch(() => ({}))
      if (!serverRes.ok) {
        setError(typeof data.error === 'string' ? data.error : t('admin.mcpHubLoadError'))
        return
      }
      setItem(data.item ?? null)
      setStatus(data.item?.status ?? 'draft')
      setRoutingHintsText(
        Array.isArray(data.item?.routingHints) ? data.item.routingHints.join(', ') : '',
      )
      setTools(Array.isArray(data.tools) ? data.tools : [])

      if (policyRes.ok) {
        const pdata = await policyRes.json().catch(() => ({}))
        const items = Array.isArray(pdata.items) ? (pdata.items as HubPolicy[]) : []
        const serverWide = items.find((p) => !p.toolId) ?? null
        setPolicy(serverWide)
        if (serverWide) {
          setOrgEffect(serverWide.effect === 'deny' ? 'deny' : 'allow')
          setOrgAllowWrite(serverWide.allowWrite !== false)
        }
      }
    } catch {
      setError(t('admin.mcpHubLoadError'))
    }
  }, [id, t])

  useEffect(() => {
    void load()
  }, [load])

  const run = async (kind: 'test' | 'discover' | 'save' | 'delete') => {
    if (!id) return
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      if (kind === 'delete') {
        const res = await fetch(apiAdminMcpServer(id), {
          method: 'DELETE',
          credentials: 'same-origin',
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setError(typeof data.error === 'string' ? data.error : t('admin.mcpHubActionError'))
          return
        }
        window.location.href = PATH_ADMIN_MCP_HUB
        return
      }
      if (kind === 'save') {
        const routingHints = routingHintsText
          .split(/[,;\n]+/)
          .map((s) => s.trim())
          .filter(Boolean)
        const res = await fetch(apiAdminMcpServer(id), {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, routingHints }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(typeof data.error === 'string' ? data.error : t('admin.mcpHubActionError'))
          return
        }
        const policyRes = await fetch(apiAdminMcpServerPolicies(id), {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ effect: orgEffect, allowWrite: orgAllowWrite }),
        })
        if (!policyRes.ok) {
          const pdata = await policyRes.json().catch(() => ({}))
          setError(typeof pdata.error === 'string' ? pdata.error : t('admin.mcpHubActionError'))
          return
        }
        setMsg(t('admin.mcpHubSaved'))
        await load()
        return
      }
      const url = kind === 'test' ? apiAdminMcpServerTest(id) : apiAdminMcpServerDiscover(id)
      const res = await fetch(url, { method: 'POST', credentials: 'same-origin' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : t('admin.mcpHubActionError'))
        return
      }
      setMsg(
        kind === 'test'
          ? t('admin.mcpHubTestOk')
          : t('admin.mcpHubDiscoverOk').replace('{n}', String(data.upserted ?? 0)),
      )
      await load()
    } catch {
      setError(t('admin.mcpHubActionError'))
    } finally {
      setBusy(false)
    }
  }

  const patchTool = async (tool: HubTool, patch: Partial<HubTool>) => {
    if (!id) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(apiAdminMcpServerTool(id, tool.id), {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(typeof data.error === 'string' ? data.error : t('admin.mcpHubActionError'))
        return
      }
      await load()
    } catch {
      setError(t('admin.mcpHubActionError'))
    } finally {
      setBusy(false)
    }
  }

  if (!item) {
    return (
      <div className="plexon-admin-stack">
        <Text role="meta">{error ?? t('common.loading')}</Text>
        <NextLink href={PATH_ADMIN_MCP_HUB}>
          <Button variant="ghost">{t('admin.mcpHubBack')}</Button>
        </NextLink>
      </div>
    )
  }

  return (
    <div className="plexon-admin-stack">
      <section className="plexon-settings-section">
        <SectionChrome
          title={item.displayName}
          meta={
            <Text role="meta">
              <code>{item.slug}</code> · {item.authKind}
            </Text>
          }
        />
        <Text role="meta" className="plexon-admin-mono">
          {item.baseUrl}
        </Text>
        {item.lastError ? (
          <Text role="meta" className="plexon-admin-error">
            {item.lastError}
          </Text>
        ) : null}
        {error ? (
          <Text role="meta" className="plexon-admin-error">
            {error}
          </Text>
        ) : null}
        {msg ? <Text role="meta">{msg}</Text> : null}
        <div className="plexon-settings-actions">
          <label>
            <Text role="meta">{t('admin.mcpHubColStatus')}</Text>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="draft">draft</option>
              <option value="active">active</option>
              <option value="disabled">disabled</option>
              <option value="error">error</option>
            </select>
          </label>
          <label className="plexon-admin-field-wide">
            <Text role="meta">{t('admin.mcpHubRoutingHints')}</Text>
            <input
              type="text"
              value={routingHintsText}
              onChange={(e) => setRoutingHintsText(e.target.value)}
              placeholder={t('admin.mcpHubRoutingHintsPlaceholder')}
            />
          </label>
          <Button variant="primary" disabled={busy} onClick={() => void run('save')}>
            {t('common.save')}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => void run('test')}>
            {t('admin.mcpHubTest')}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => void run('discover')}>
            {t('admin.mcpHubDiscover')}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => void run('delete')}>
            {t('admin.mcpHubDelete')}
          </Button>
          <NextLink href={PATH_ADMIN_MCP_HUB}>
            <Button variant="ghost">{t('admin.mcpHubBack')}</Button>
          </NextLink>
        </div>
      </section>

      <section className="plexon-settings-section">
        <SectionChrome
          title={t('admin.mcpHubPolicyTitle')}
          meta={<Text role="meta">{t('admin.mcpHubPolicyHint')}</Text>}
        />
        <div className="plexon-settings-actions">
          <label>
            <Text role="meta">{t('admin.mcpHubPolicyEffect')}</Text>
            <select
              value={orgEffect}
              onChange={(e) => setOrgEffect(e.target.value === 'deny' ? 'deny' : 'allow')}
            >
              <option value="allow">allow</option>
              <option value="deny">deny</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={orgAllowWrite}
              onChange={(e) => setOrgAllowWrite(e.target.checked)}
            />
            <Text role="meta">{t('admin.mcpHubPolicyAllowWrite')}</Text>
          </label>
          {policy ? (
            <Text role="meta">
              {t('admin.mcpHubPolicyCurrent')}: {policy.effect}
              {policy.allowWrite ? ' · write' : ' · read-only'}
            </Text>
          ) : null}
        </div>
      </section>

      <section className="plexon-settings-section">
        <SectionChrome
          title={t('admin.mcpHubToolsTitle')}
          meta={
            <Text role="meta">
              {t('admin.mcpHubToolsHint')}
              {item.lastDiscoveryAt
                ? ` · ${new Date(item.lastDiscoveryAt).toLocaleString()}`
                : ''}
            </Text>
          }
        />
        <table className="plexon-admin-table">
          <thead>
            <tr>
              <th>{t('admin.mcpHubColEnabled')}</th>
              <th>exposedName</th>
              <th>mcpName</th>
              <th>sideEffect</th>
              <th>{t('admin.mcpHubColConfirm')}</th>
              <th>{t('admin.mcpHubColCapability')}</th>
              <th>{t('admin.mcpHubColDescription')}</th>
            </tr>
          </thead>
          <tbody>
            {tools.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <Text role="meta">{t('admin.mcpHubToolsEmpty')}</Text>
                </td>
              </tr>
            ) : (
              tools.map((tool) => (
                <tr key={tool.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={tool.enabled}
                      disabled={busy}
                      onChange={() => void patchTool(tool, { enabled: !tool.enabled })}
                    />
                  </td>
                  <td>
                    <code>{tool.exposedName}</code>
                  </td>
                  <td>
                    <code>{tool.mcpName}</code>
                  </td>
                  <td>
                    <select
                      value={tool.sideEffect}
                      disabled={busy}
                      onChange={(e) =>
                        void patchTool(tool, { sideEffect: e.target.value })
                      }
                    >
                      <option value="read">read</option>
                      <option value="write">write</option>
                      <option value="destructive">destructive</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={tool.requireConfirm}
                      disabled={busy}
                      onChange={() =>
                        void patchTool(tool, { requireConfirm: !tool.requireConfirm })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      defaultValue={tool.capabilityId ?? ''}
                      disabled={busy}
                      placeholder="hub.canva.templates"
                      onBlur={(e) => {
                        const next = e.target.value.trim() || null
                        if (next === (tool.capabilityId ?? null)) return
                        void patchTool(tool, { capabilityId: next })
                      }}
                    />
                  </td>
                  <td>
                    <Text role="meta">{tool.description ?? '—'}</Text>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
