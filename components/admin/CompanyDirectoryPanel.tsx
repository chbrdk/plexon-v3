'use client'

/**
 * Enterprise E9 — company directory stub panel.
 * Spec: suite-enterprise-program.md § E9
 */

import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Field, SectionChrome, Select, Spinner, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import { apiAdminCompanyDirectory } from '@/lib/constants'

type DirectoryState = {
  companyId: string
  provider: 'none' | 'oidc' | 'saml'
  passwordLoginDisabled: boolean
  scimEnabled: boolean
  ready: boolean
  note?: string
}

type Props = { companyId: string }

export function CompanyDirectoryPanel({ companyId }: Props) {
  const { t } = useI18n()
  const [state, setState] = useState<DirectoryState | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiAdminCompanyDirectory(companyId), {
        credentials: 'same-origin',
      })
      if (!res.ok) throw new Error(t('admin.directory.loadError'))
      const next = (await res.json()) as DirectoryState
      setState(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.directory.loadError'))
      setState(null)
    } finally {
      setLoading(false)
    }
  }, [companyId, t])

  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    if (!state) return
    setBusy(true)
    setError(null)
    setSavedMsg(null)
    try {
      const res = await fetch(apiAdminCompanyDirectory(companyId), {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: state.provider,
          passwordLoginDisabled: state.passwordLoginDisabled,
          scimEnabled: state.scimEnabled,
        }),
      })
      const json = (await res.json().catch(() => null)) as DirectoryState & {
        error?: string
      } | null
      if (!res.ok) {
        throw new Error(json?.error || t('admin.directory.saveError'))
      }
      setState({
        ...state,
        ...json,
        companyId,
      })
      setSavedMsg(t('admin.directory.saved'))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.directory.saveError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      className="plexon-settings-section"
      data-testid="company-directory-panel"
      aria-label={t('admin.directory.title')}
    >
      <SectionChrome
        title={t('admin.directory.title')}
        meta={<Text role="meta">{t('admin.directory.subtitle')}</Text>}
      />
      {loading ? <Spinner /> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      {savedMsg ? <Alert tone="success">{savedMsg}</Alert> : null}
      {!loading && state ? (
        <div className="plexon-settings-fields plexon-admin-form-narrow">
          <Text role="meta">{state.note || t('admin.directory.notReady')}</Text>
          <Field label={t('admin.directory.provider')}>
            <Select
              options={[
                { value: 'none', label: t('admin.directory.providerNone') },
                { value: 'oidc', label: 'OIDC' },
                { value: 'saml', label: 'SAML' },
              ]}
              value={state.provider}
              onChange={(v) =>
                setState((prev) =>
                  prev
                    ? {
                        ...prev,
                        provider: (v as DirectoryState['provider']) || 'none',
                      }
                    : prev
                )
              }
            />
          </Field>
          <label className="plexon-admin-check">
            <input
              type="checkbox"
              checked={state.scimEnabled}
              onChange={(e) =>
                setState((prev) =>
                  prev ? { ...prev, scimEnabled: e.target.checked } : prev
                )
              }
            />
            <span>{t('admin.directory.scimEnabled')}</span>
          </label>
          <label className="plexon-admin-check">
            <input
              type="checkbox"
              checked={state.passwordLoginDisabled}
              disabled={state.provider === 'none'}
              onChange={(e) =>
                setState((prev) =>
                  prev
                    ? { ...prev, passwordLoginDisabled: e.target.checked }
                    : prev
                )
              }
            />
            <span>{t('admin.directory.passwordLoginDisabled')}</span>
          </label>
          <Button variant="primary" onClick={() => void save()} disabled={busy}>
            {busy ? t('common.loading') : t('admin.directory.save')}
          </Button>
        </div>
      ) : null}
    </section>
  )
}
