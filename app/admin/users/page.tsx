'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import NextLink from 'next/link'
import { Alert, Button, Field, Input, SectionChrome, Spinner, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import {
  API_ADMIN_USERS,
  apiAdminUser,
  pathAdminCompany,
  pathAdminUserEditOnDashboard,
} from '@/lib/constants'

type UserOrg = { companyId: string; companyName: string; companySlug: string | null; role: string }

type UserRow = {
  id: string
  email?: string
  name?: string
  company?: string
  locale?: string
  role?: string
  createdAt?: string
  organizations?: UserOrg[]
}

export default function AdminUsersPage() {
  const { t } = useI18n()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(API_ADMIN_USERS, { credentials: 'same-origin' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((data as { error?: string }).error ?? t('admin.loadError'))
        setUsers([])
        return
      }
      setUsers(Array.isArray(data.data) ? data.data : [])
    } catch {
      setError(t('admin.loadError'))
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm(t('dashboard.deleteUserConfirm'))) return
      setDeletingId(id)
      setError(null)
      try {
        const res = await fetch(apiAdminUser(id), { method: 'DELETE', credentials: 'same-origin' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError((data as { error?: string }).error ?? t('admin.deleteUserFailed'))
          return
        }
        await load()
      } catch {
        setError(t('admin.deleteUserFailed'))
      } finally {
        setDeletingId(null)
      }
    },
    [load, t],
  )

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return users
    return users.filter((u) => {
      const orgMatch = (u.organizations ?? []).some(
        (o) =>
          o.companyName.toLowerCase().includes(s) ||
          (o.companySlug ?? '').toLowerCase().includes(s) ||
          o.companyId.toLowerCase().includes(s) ||
          o.role.toLowerCase().includes(s),
      )
      return (
        u.id.toLowerCase().includes(s) ||
        (u.email ?? '').toLowerCase().includes(s) ||
        (u.name ?? '').toLowerCase().includes(s) ||
        (u.company ?? '').toLowerCase().includes(s) ||
        orgMatch
      )
    })
  }, [users, q])

  return (
    <div className="plexon-admin-stack">
      <SectionChrome
        title={t('admin.usersTitle')}
        meta={<Text role="meta">{t('admin.usersSubtitle')}</Text>}
      />

      <div className="plexon-admin-toolbar">
        <Field label={t('admin.searchUsers')}>
          <Input block value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
        <Button variant="ghost" onClick={() => void load()} disabled={loading}>
          {loading ? t('common.loading') : t('admin.refreshList')}
        </Button>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {loading ? (
        <Text role="meta">
          <Spinner size="sm" /> {t('common.loading')}
        </Text>
      ) : (
        <div className="plexon-admin-table-wrap">
          <Text role="meta">
            {t('admin.listMetaFiltered', { filtered: filtered.length, total: users.length })}
          </Text>
          {filtered.length === 0 ? (
            <Text role="meta">{t('admin.usersNoMatches')}</Text>
          ) : (
            <table className="plexon-admin-table">
              <thead>
                <tr>
                  <th>{t('dashboard.email')}</th>
                  <th>{t('dashboard.name')}</th>
                  <th>{t('admin.usersProfileCompany')}</th>
                  <th>{t('dashboard.role')}</th>
                  <th>{t('admin.usersOrganizations')}</th>
                  <th>ID</th>
                  <th className="plexon-admin-table__actions">{t('dashboard.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td>{u.email ?? '—'}</td>
                    <td>{u.name ?? '—'}</td>
                    <td className="plexon-admin-muted">{u.company ?? '—'}</td>
                    <td>{u.role ?? '—'}</td>
                    <td>
                      {(u.organizations ?? []).length === 0 ? (
                        <span className="plexon-admin-muted">—</span>
                      ) : (
                        <ul className="plexon-admin-org-list">
                          {(u.organizations ?? []).map((o) => (
                            <li key={`${u.id}-${o.companyId}`}>
                              <NextLink href={pathAdminCompany(o.companyId)} className="plexon-admin-link">
                                {o.companyName}
                              </NextLink>
                              <span className="plexon-admin-muted"> ({o.role})</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="plexon-admin-mono">{u.id}</td>
                    <td className="plexon-admin-table__actions">
                      <div className="plexon-settings-actions plexon-admin-row-actions">
                        <NextLink href={pathAdminUserEditOnDashboard(u.id)}>
                          <Button variant="primary" size="sm">
                            {t('admin.fullEdit')}
                          </Button>
                        </NextLink>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={deletingId === u.id || loading}
                          onClick={() => void handleDelete(u.id)}
                        >
                          {deletingId === u.id ? t('admin.deletingUser') : t('dashboard.delete')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
