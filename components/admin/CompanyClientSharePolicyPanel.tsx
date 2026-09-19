'use client'

import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Field, Input, SectionChrome, Spinner, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import { apiAdminCompanyClientSharePolicy } from '@/lib/constants'
import type { ClientSharePolicy } from '@/lib/creation-client-share'

const emptyPolicy: ClientSharePolicy = {
  enabled: true,
  allowPublicLink: false,
  requirePassword: true,
  maxTtlDays: 30,
  allowLiveHead: true,
  allowEmailAllowlist: true,
}

type Props = { companyId: string }

/** Admin: company Client Page Share defaults (P6). Spec: creation-client-share.md */
export function CompanyClientSharePolicyPanel({ companyId }: Props) {
  const { t } = useI18n()
  const [policy, setPolicy] = useState<ClientSharePolicy | null>(null)
  const [ttlDraft, setTtlDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiAdminCompanyClientSharePolicy(companyId), {
        credentials: 'same-origin',
      })
      if (!res.ok) throw new Error(t('admin.clientShare.loadError'))
      const next = (await res.json()) as ClientSharePolicy
      setPolicy(next)
      setTtlDraft(
        next.maxTtlDays === null || next.maxTtlDays === undefined
          ? ''
          : String(next.maxTtlDays)
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.clientShare.loadError'))
      setPolicy(null)
    } finally {
      setLoading(false)
    }
  }, [companyId, t])

  useEffect(() => {
    void load()
  }, [load])

  const patch = async (partial: Partial<ClientSharePolicy>) => {
    if (!policy) return
    setBusy(true)
    setError(null)
    setSavedMsg(null)
    try {
      const res = await fetch(apiAdminCompanyClientSharePolicy(companyId), {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      })
      const body = (await res.json().catch(() => ({}))) as ClientSharePolicy & {
        error?: string
      }
      if (!res.ok) throw new Error(body.error || t('admin.clientShare.saveError'))
      setPolicy(body)
      setTtlDraft(
        body.maxTtlDays === null || body.maxTtlDays === undefined
          ? ''
          : String(body.maxTtlDays)
      )
      setSavedMsg(t('admin.clientShare.saved'))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.clientShare.saveError'))
    } finally {
      setBusy(false)
    }
  }

  const saveTtl = async () => {
    const trimmed = ttlDraft.trim()
    if (!trimmed) {
      await patch({ maxTtlDays: null })
      return
    }
    const n = Number.parseInt(trimmed, 10)
    if (!Number.isFinite(n) || n < 1) {
      setError(t('admin.clientShare.ttlInvalid'))
      return
    }
    await patch({ maxTtlDays: n })
  }

  const display = policy ?? emptyPolicy

  return (
    <section
      className="plexon-settings-section"
      data-testid="company-client-share-policy"
      aria-label={t('admin.clientShare.title')}
    >
      <SectionChrome
        title={t('admin.clientShare.title')}
        meta={<Text role="meta">{t('admin.clientShare.subtitle')}</Text>}
      />

      {loading ? (
        <Text role="meta">
          <Spinner size="sm" /> {t('common.loading')}
        </Text>
      ) : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      {savedMsg ? <Alert tone="ok">{savedMsg}</Alert> : null}

      {!loading && policy ? (
        <div className="plexon-collection-client-shares-policy">
          <label className="plexon-collection-client-shares-check">
            <input
              type="checkbox"
              checked={display.enabled}
              disabled={busy}
              onChange={(e) => void patch({ enabled: e.target.checked })}
              data-testid="company-client-share-enabled"
            />
            <span>{t('admin.clientShare.enabled')}</span>
          </label>
          <label className="plexon-collection-client-shares-check">
            <input
              type="checkbox"
              checked={display.allowPublicLink}
              disabled={busy || !display.enabled}
              onChange={(e) => void patch({ allowPublicLink: e.target.checked })}
            />
            <span>{t('admin.clientShare.allowPublicLink')}</span>
          </label>
          <label className="plexon-collection-client-shares-check">
            <input
              type="checkbox"
              checked={display.requirePassword}
              disabled={busy || !display.enabled}
              onChange={(e) => void patch({ requirePassword: e.target.checked })}
            />
            <span>{t('admin.clientShare.requirePassword')}</span>
          </label>
          <label className="plexon-collection-client-shares-check">
            <input
              type="checkbox"
              checked={display.allowLiveHead}
              disabled={busy || !display.enabled}
              onChange={(e) => void patch({ allowLiveHead: e.target.checked })}
            />
            <span>{t('admin.clientShare.allowLiveHead')}</span>
          </label>
          <label className="plexon-collection-client-shares-check">
            <input
              type="checkbox"
              checked={display.allowEmailAllowlist}
              disabled={busy || !display.enabled}
              onChange={(e) => void patch({ allowEmailAllowlist: e.target.checked })}
            />
            <span>{t('admin.clientShare.allowEmailAllowlist')}</span>
          </label>
          <div className="plexon-collection-client-shares-ttl">
            <Field label={t('admin.clientShare.maxTtlDays')}>
              <Input
                type="number"
                min={1}
                value={ttlDraft}
                disabled={busy || !display.enabled}
                onChange={(e) => setTtlDraft(e.target.value)}
                placeholder={t('admin.clientShare.maxTtlUnlimited')}
              />
            </Field>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy || !display.enabled}
              onClick={() => void saveTtl()}
            >
              {t('admin.clientShare.saveTtl')}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
