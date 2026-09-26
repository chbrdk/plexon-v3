'use client'

import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Field, Input, SectionChrome, Spinner, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import {
  apiPlatformProvisioningCollectionClientShare,
  apiPlatformProvisioningCollectionClientShareEventsExport,
  apiPlatformProvisioningCollectionClientSharePolicy,
  apiPlatformProvisioningCollectionClientShares,
} from '@/lib/constants'
import type { ClientSharePolicy } from '@/lib/creation-client-share'

type ShareItem = {
  shareId: string
  sceneId: string
  pageIds: string[]
  accessMode: string
  contentMode: string
  label: string | null
  expiresAt: string | null
  revokedAt: string | null
  createdAt: string
}

type Props = {
  platformProjectId: string
  /** When false, policy PATCH / revoke are hidden (viewers). Default true for managers. */
  canManage?: boolean
  /** When true, only policy controls (no Creation-only inventory). Spec: collection-share-links.md */
  policyOnly?: boolean
}

const emptyPolicy: ClientSharePolicy = {
  enabled: true,
  allowPublicLink: false,
  requirePassword: true,
  maxTtlDays: 30,
  allowLiveHead: true,
  allowEmailAllowlist: true,
}

/** Collection Client Page Share policy + inventory (P4). Spec: creation-client-share.md */
export function CollectionClientSharesPanel({
  platformProjectId,
  canManage = true,
  policyOnly = false,
}: Props) {
  const { t } = useI18n()
  const [policy, setPolicy] = useState<ClientSharePolicy | null>(null)
  const [items, setItems] = useState<ShareItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [ttlDraft, setTtlDraft] = useState('')

  const [exportBusy, setExportBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const policyRes = await fetch(
        apiPlatformProvisioningCollectionClientSharePolicy(platformProjectId),
        { credentials: 'same-origin' },
      )
      if (!policyRes.ok) {
        throw new Error(t('projects.detail.clientShares.loadError'))
      }
      const nextPolicy = (await policyRes.json()) as ClientSharePolicy
      setPolicy(nextPolicy)
      setTtlDraft(
        nextPolicy.maxTtlDays === null || nextPolicy.maxTtlDays === undefined
          ? ''
          : String(nextPolicy.maxTtlDays)
      )

      if (!policyOnly) {
        const listRes = await fetch(
          apiPlatformProvisioningCollectionClientShares(platformProjectId),
          { credentials: 'same-origin' },
        )
        if (!listRes.ok) {
          throw new Error(t('projects.detail.clientShares.loadError'))
        }
        const listBody = (await listRes.json()) as { items?: ShareItem[] }
        setItems(Array.isArray(listBody.items) ? listBody.items : [])
      } else {
        setItems([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('projects.detail.clientShares.loadError'))
      setPolicy(null)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [platformProjectId, policyOnly, t])

  useEffect(() => {
    void load()
  }, [load])

  const patchPolicy = async (patch: Partial<ClientSharePolicy>) => {
    if (!canManage || !policy) return
    setBusy(true)
    setError(null)
    setSavedMsg(null)
    try {
      const res = await fetch(
        apiPlatformProvisioningCollectionClientSharePolicy(platformProjectId),
        {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        }
      )
      const body = (await res.json().catch(() => ({}))) as ClientSharePolicy & {
        error?: string
      }
      if (!res.ok) {
        throw new Error(body.error || t('projects.detail.clientShares.saveError'))
      }
      setPolicy(body)
      setTtlDraft(
        body.maxTtlDays === null || body.maxTtlDays === undefined
          ? ''
          : String(body.maxTtlDays)
      )
      setSavedMsg(t('projects.detail.clientShares.saved'))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('projects.detail.clientShares.saveError'))
    } finally {
      setBusy(false)
    }
  }

  const saveTtl = async () => {
    const trimmed = ttlDraft.trim()
    if (!trimmed) {
      await patchPolicy({ maxTtlDays: null })
      return
    }
    const n = Number.parseInt(trimmed, 10)
    if (!Number.isFinite(n) || n < 1) {
      setError(t('projects.detail.clientShares.ttlInvalid'))
      return
    }
    await patchPolicy({ maxTtlDays: n })
  }

  const exportAudit = async () => {
    setExportBusy(true)
    setError(null)
    try {
      const res = await fetch(
        apiPlatformProvisioningCollectionClientShareEventsExport(platformProjectId),
        { credentials: 'same-origin' }
      )
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error || t('projects.detail.clientShares.exportError'))
      }
      const blob = await res.blob()
      const disposition = res.headers.get('content-disposition') ?? ''
      const match = /filename="([^"]+)"/.exec(disposition)
      const filename = match?.[1] ?? `client-share-audit-${platformProjectId.slice(0, 8)}.csv`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('projects.detail.clientShares.exportError'))
    } finally {
      setExportBusy(false)
    }
  }

  const revoke = async (shareId: string) => {
    if (!canManage) return
    if (!window.confirm(t('projects.detail.clientShares.revokeConfirm'))) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(
        apiPlatformProvisioningCollectionClientShare(platformProjectId, shareId),
        { method: 'DELETE', credentials: 'same-origin' }
      )
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        throw new Error(body.error || t('projects.detail.clientShares.revokeError'))
      }
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('projects.detail.clientShares.revokeError'))
    } finally {
      setBusy(false)
    }
  }

  const active = items.filter((i) => !i.revokedAt)
  const revoked = items.filter((i) => i.revokedAt)
  const display = policy ?? emptyPolicy

  return (
    <section
      className="plexon-settings-section plexon-collection-client-shares"
      data-testid="collection-client-shares-panel"
      aria-label={t('projects.detail.clientShares.title')}
    >
      <SectionChrome
        title={
          policyOnly
            ? t('projects.detail.clientShares.policyTitle')
            : t('projects.detail.clientShares.title')
        }
        meta={
          <Text role="meta">
            {policyOnly
              ? t('projects.detail.clientShares.policySubtitle')
              : t('projects.detail.clientShares.subtitle')}
          </Text>
        }
        action={
          policyOnly ? null : (
          <Button
            variant="ghost"
            size="sm"
            disabled={loading || exportBusy}
            onClick={() => void exportAudit()}
            data-testid="client-share-export-audit"
          >
            {exportBusy
              ? t('common.loading')
              : t('projects.detail.clientShares.exportAudit')}
          </Button>
          )
        }
      />

      {loading ? (
        <Text role="meta">
          <Spinner size="sm" /> {t('common.loading')}
        </Text>
      ) : null}

      {error ? <Alert tone="error">{error}</Alert> : null}
      {savedMsg ? <Alert tone="ok">{savedMsg}</Alert> : null}

      {!loading && policy ? (
        <>
          <Text role="meta">{t('projects.detail.clientShares.companyCeilingHint')}</Text>
          <div className="plexon-collection-client-shares-policy">
            <label className="plexon-collection-client-shares-check">
              <input
                type="checkbox"
                checked={display.enabled}
                disabled={!canManage || busy}
                onChange={(e) => void patchPolicy({ enabled: e.target.checked })}
                data-testid="client-share-policy-enabled"
              />
              <span>{t('projects.detail.clientShares.enabled')}</span>
            </label>
            <label className="plexon-collection-client-shares-check">
              <input
                type="checkbox"
                checked={display.allowPublicLink}
                disabled={!canManage || busy || !display.enabled}
                onChange={(e) => void patchPolicy({ allowPublicLink: e.target.checked })}
                data-testid="client-share-policy-public"
              />
              <span>{t('projects.detail.clientShares.allowPublicLink')}</span>
            </label>
            <label className="plexon-collection-client-shares-check">
              <input
                type="checkbox"
                checked={display.requirePassword}
                disabled={!canManage || busy || !display.enabled}
                onChange={(e) => void patchPolicy({ requirePassword: e.target.checked })}
                data-testid="client-share-policy-password"
              />
              <span>{t('projects.detail.clientShares.requirePassword')}</span>
            </label>
            <label className="plexon-collection-client-shares-check">
              <input
                type="checkbox"
                checked={display.allowLiveHead}
                disabled={!canManage || busy || !display.enabled}
                onChange={(e) => void patchPolicy({ allowLiveHead: e.target.checked })}
                data-testid="client-share-policy-live"
              />
              <span>{t('projects.detail.clientShares.allowLiveHead')}</span>
            </label>
            <label className="plexon-collection-client-shares-check">
              <input
                type="checkbox"
                checked={display.allowEmailAllowlist}
                disabled={!canManage || busy || !display.enabled}
                onChange={(e) => void patchPolicy({ allowEmailAllowlist: e.target.checked })}
                data-testid="client-share-policy-email"
              />
              <span>{t('projects.detail.clientShares.allowEmailAllowlist')}</span>
            </label>
            {canManage ? (
              <div className="plexon-collection-client-shares-ttl">
                <Field label={t('projects.detail.clientShares.maxTtlDays')}>
                  <Input
                    type="number"
                    min={1}
                    value={ttlDraft}
                    disabled={busy || !display.enabled}
                    onChange={(e) => setTtlDraft(e.target.value)}
                    placeholder={t('projects.detail.clientShares.maxTtlUnlimited')}
                    data-testid="client-share-policy-ttl"
                  />
                </Field>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy || !display.enabled}
                  onClick={() => void saveTtl()}
                >
                  {t('projects.detail.clientShares.saveTtl')}
                </Button>
              </div>
            ) : (
              <Text role="meta">
                {t('projects.detail.clientShares.maxTtlDays')}:{' '}
                {display.maxTtlDays ?? t('projects.detail.clientShares.maxTtlUnlimited')}
              </Text>
            )}
          </div>

          {!policyOnly ? (
          <div className="plexon-collection-client-shares-list">
            <Text as="h3" role="label">
              {t('projects.detail.clientShares.inventoryTitle')}
            </Text>
            {active.length === 0 ? (
              <Text role="meta">{t('projects.detail.clientShares.inventoryEmpty')}</Text>
            ) : (
              <ul className="plexon-collection-client-shares-ul">
                {active.map((item) => (
                  <li key={item.shareId} data-testid={`client-share-row-${item.shareId}`}>
                    <div className="plexon-collection-client-shares-row">
                      <div>
                        <Text as="p" role="label">
                          {item.label?.trim() || item.shareId.slice(0, 8)}
                        </Text>
                        <Text role="meta">
                          {item.accessMode} · {item.contentMode} · {item.pageIds.length}{' '}
                          {t('projects.detail.clientShares.pages')}
                          {item.expiresAt
                            ? ` · ${t('projects.detail.clientShares.expires')} ${new Date(item.expiresAt).toLocaleDateString()}`
                            : ''}
                        </Text>
                      </div>
                      {canManage ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => void revoke(item.shareId)}
                          data-testid={`client-share-revoke-${item.shareId}`}
                        >
                          {t('projects.detail.clientShares.revoke')}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {revoked.length > 0 ? (
              <Text role="meta">
                {t('projects.detail.clientShares.revokedCount', {
                  count: String(revoked.length),
                })}
              </Text>
            ) : null}
          </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
