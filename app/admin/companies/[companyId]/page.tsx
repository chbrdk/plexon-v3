'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import NextLink from 'next/link'
import { useParams } from 'next/navigation'
import {
  Alert,
  Button,
  Field,
  Input,
  Panel,
  SectionChrome,
  Select,
  Spinner,
  Text,
} from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import {
  API_ADMIN_USERS,
  apiAdminCompany,
  apiAdminCompanyMembers,
  apiAdminCompanyPlatformProjects,
  apiAdminPlatformProject,
  apiAdminPlatformProjectSync,
  PATH_ADMIN_COMPANIES,
  pathPlatformProjectDashboard,
} from '@/lib/constants'
import { COMPANY_USER_ROLE, type CompanyUserRole } from '@/lib/platform-companies'

type Company = { id: string; name: string; slug: string | null; createdAt: string; updatedAt: string }
type MemberRow = { companyId?: string; userId: string; role: string; createdAt?: string; updatedAt?: string }
type PlatformProject = {
  id: string
  companyId: string
  name: string
  domain: string | null
  status: string
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
}
type Binding = {
  platformProjectId: string
  productId: string
  externalProjectId: string | null
  syncStatus: string
  syncMessage: string | null
  lastSyncAt: string | null
}
type DirectoryUser = { id: string; email?: string; name?: string }

export default function AdminCompanyDetailPage() {
  const params = useParams<{ companyId: string }>()
  const companyId = params.companyId as string
  const { t } = useI18n()

  const [company, setCompany] = useState<Company | null>(null)
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [members, setMembers] = useState<MemberRow[]>([{ userId: '', role: COMPANY_USER_ROLE.MEMBER }])
  const [projects, setProjects] = useState<PlatformProject[]>([])
  const [bindingsByProject, setBindingsByProject] = useState<Record<string, Binding[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingCompany, setSavingCompany] = useState(false)
  const [savingMembers, setSavingMembers] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDomain, setNewProjectDomain] = useState('')
  const [creatingProject, setCreatingProject] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [userDirectory, setUserDirectory] = useState<DirectoryUser[]>([])
  const [memberDirectoryFilter, setMemberDirectoryFilter] = useState('')

  const roleOptions = useMemo(
    () => [
      { value: COMPANY_USER_ROLE.OWNER, label: t('admin.roleOwner') },
      { value: COMPANY_USER_ROLE.ADMIN, label: t('admin.roleCompanyAdmin') },
      { value: COMPANY_USER_ROLE.MEMBER, label: t('admin.roleCompanyMember') },
    ],
    [t],
  )

  const filteredUserDirectory = useMemo(() => {
    const s = memberDirectoryFilter.trim().toLowerCase()
    const base = !s
      ? userDirectory
      : userDirectory.filter(
          (u) =>
            u.id.toLowerCase().includes(s) ||
            (u.email ?? '').toLowerCase().includes(s) ||
            (u.name ?? '').toLowerCase().includes(s),
        )
    return [...base].sort((a, b) =>
      (a.email ?? a.name ?? a.id).localeCompare(b.email ?? b.name ?? b.id, undefined, {
        sensitivity: 'base',
      }),
    )
  }, [userDirectory, memberDirectoryFilter])

  const loadBindings = useCallback(async (list: PlatformProject[]) => {
    const next: Record<string, Binding[]> = {}
    await Promise.all(
      list.map(async (p) => {
        try {
          const res = await fetch(apiAdminPlatformProject(p.id), { credentials: 'same-origin' })
          const data = await res.json().catch(() => ({}))
          if (res.ok && Array.isArray(data.bindings)) {
            next[p.id] = data.bindings as Binding[]
          } else {
            next[p.id] = []
          }
        } catch {
          next[p.id] = []
        }
      }),
    )
    setBindingsByProject(next)
  }, [])

  const loadAll = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      const [cRes, mRes, pRes, uRes] = await Promise.all([
        fetch(apiAdminCompany(companyId), { credentials: 'same-origin' }),
        fetch(apiAdminCompanyMembers(companyId), { credentials: 'same-origin' }),
        fetch(apiAdminCompanyPlatformProjects(companyId), { credentials: 'same-origin' }),
        fetch(API_ADMIN_USERS, { credentials: 'same-origin' }),
      ])
      const cData = await cRes.json().catch(() => ({}))
      if (!cRes.ok) {
        setError((cData as { error?: string }).error ?? t('admin.loadError'))
        setCompany(null)
        setUserDirectory([])
        return
      }
      const co = cData as Company
      setCompany(co)
      setEditName(co.name)
      setEditSlug(co.slug ?? '')

      const mData = await mRes.json().catch(() => ({}))
      const mItems = Array.isArray(mData.items) ? (mData.items as MemberRow[]) : []
      setMembers(mItems.length > 0 ? mItems : [{ userId: '', role: COMPANY_USER_ROLE.MEMBER }])

      const pData = await pRes.json().catch(() => ({}))
      const plist = Array.isArray(pData.items) ? (pData.items as PlatformProject[]) : []
      setProjects(plist)
      await loadBindings(plist)

      const uData = await uRes.json().catch(() => ({}))
      if (uRes.ok && Array.isArray(uData.data)) {
        setUserDirectory(
          uData.data
            .map((row: { id?: string; email?: string; name?: string }) => ({
              id: String(row.id ?? ''),
              email: typeof row.email === 'string' ? row.email : undefined,
              name: typeof row.name === 'string' ? row.name : undefined,
            }))
            .filter((u: DirectoryUser) => u.id),
        )
      } else {
        setUserDirectory([])
      }
    } catch {
      setError(t('admin.loadError'))
    } finally {
      setLoading(false)
    }
  }, [companyId, t, loadBindings])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const saveCompany = async () => {
    if (!companyId) return
    setSavingCompany(true)
    setError(null)
    try {
      const res = await fetch(apiAdminCompany(companyId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: editName.trim(),
          slug: editSlug.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((data as { error?: string }).error ?? t('admin.loadError'))
        return
      }
      setCompany(data as Company)
    } finally {
      setSavingCompany(false)
    }
  }

  const saveMembers = async () => {
    if (!companyId) return
    setSavingMembers(true)
    setError(null)
    try {
      const items = members
        .filter((m) => m.userId.trim())
        .map((m) => ({
          userId: m.userId.trim(),
          role: m.role as CompanyUserRole,
        }))
      const res = await fetch(apiAdminCompanyMembers(companyId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ items }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((data as { error?: string }).error ?? t('admin.loadError'))
        return
      }
      const mItems = Array.isArray(data.items) ? (data.items as MemberRow[]) : []
      setMembers(mItems.length > 0 ? mItems : [{ userId: '', role: COMPANY_USER_ROLE.MEMBER }])
    } finally {
      setSavingMembers(false)
    }
  }

  const createProject = async () => {
    if (!companyId || !newProjectName.trim()) return
    setCreatingProject(true)
    setError(null)
    try {
      const res = await fetch(apiAdminCompanyPlatformProjects(companyId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: newProjectName.trim(),
          domain: newProjectDomain.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((data as { error?: string }).error ?? t('admin.loadError'))
        return
      }
      setNewProjectName('')
      setNewProjectDomain('')
      await loadAll()
    } finally {
      setCreatingProject(false)
    }
  }

  const syncProject = async (platformProjectId: string) => {
    setSyncingId(platformProjectId)
    setSyncMessage(null)
    setError(null)
    try {
      const res = await fetch(apiAdminPlatformProjectSync(platformProjectId), {
        method: 'POST',
        credentials: 'same-origin',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((data as { error?: string }).error ?? t('admin.loadError'))
        return
      }
      setSyncMessage(JSON.stringify(data.results ?? data, null, 2))
      await loadAll()
    } finally {
      setSyncingId(null)
    }
  }

  const deleteProject = async (platformProjectId: string) => {
    if (!window.confirm(t('admin.deleteProjectConfirm'))) return
    setError(null)
    try {
      const res = await fetch(apiAdminPlatformProject(platformProjectId), {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? t('admin.loadError'))
        return
      }
      await loadAll()
    } catch {
      setError(t('admin.loadError'))
    }
  }

  if (loading && !company) {
    return (
      <Text role="meta">
        <Spinner size="sm" /> {t('common.loading')}
      </Text>
    )
  }

  if (!company) {
    return (
      <div className="plexon-admin-stack">
        <Alert tone="error">{error ?? t('admin.loadError')}</Alert>
        <NextLink href={PATH_ADMIN_COMPANIES} className="plexon-admin-link">
          {t('admin.back')}
        </NextLink>
      </div>
    )
  }

  return (
    <div className="plexon-admin-stack">
      <NextLink href={PATH_ADMIN_COMPANIES} className="plexon-admin-link">
        ← {t('admin.back')}
      </NextLink>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <section className="plexon-settings-section" aria-label={t('admin.editCompany')}>
        <SectionChrome title={t('admin.editCompany')} />
        <div className="plexon-settings-fields plexon-admin-form-narrow">
          <Field label={t('admin.companyName')}>
            <Input block value={editName} onChange={(e) => setEditName(e.target.value)} />
          </Field>
          <Field label={t('admin.companySlug')}>
            <Input block value={editSlug} onChange={(e) => setEditSlug(e.target.value)} />
          </Field>
          <Button variant="primary" onClick={() => void saveCompany()} disabled={savingCompany}>
            {savingCompany ? t('common.loading') : t('admin.saveCompany')}
          </Button>
        </div>
      </section>

      <section className="plexon-settings-section" aria-label={t('admin.membersTitle')}>
        <SectionChrome
          title={t('admin.membersTitle')}
          meta={<Text role="meta">{t('admin.membersRolesHint')}</Text>}
        />
        <div className="plexon-settings-fields plexon-admin-form-narrow">
          <Field label={t('admin.memberDirectoryFilter')}>
            <Input
              block
              value={memberDirectoryFilter}
              onChange={(e) => setMemberDirectoryFilter(e.target.value)}
            />
          </Field>
        </div>
        <div className="plexon-admin-member-rows">
          {members.map((m, idx) => {
            const uid = m.userId.trim()
            const takenElsewhere = new Set(
              members
                .map((row, mi) => (mi !== idx && row.userId.trim() ? row.userId.trim() : ''))
                .filter(Boolean),
            )
            const pickable = filteredUserDirectory.filter(
              (u) => !takenElsewhere.has(u.id) || u.id === uid,
            )
            const orphanId = Boolean(uid && !userDirectory.some((u) => u.id === uid))
            const userOptions = [
              { value: '', label: '—' },
              ...(orphanId
                ? [{ value: uid, label: `${uid} (${t('admin.memberUserId')})` }]
                : []),
              ...pickable.map((u) => ({
                value: u.id,
                label: `${u.email ?? u.name ?? u.id}${u.name && u.email ? ` · ${u.name}` : ''}`,
              })),
            ]
            return (
              <div key={idx} className="plexon-admin-member-row">
                <Field label={t('admin.memberUserPick')}>
                  <Select
                    options={userOptions}
                    value={m.userId}
                    onChange={(v) => {
                      setMembers((prev) =>
                        prev.map((row, i) => (i === idx ? { ...row, userId: v } : row)),
                      )
                    }}
                  />
                </Field>
                <Field label={t('admin.memberRole')}>
                  <Select
                    options={roleOptions}
                    value={m.role}
                    onChange={(v) => {
                      setMembers((prev) =>
                        prev.map((row, i) => (i === idx ? { ...row, role: v } : row)),
                      )
                    }}
                  />
                </Field>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMembers((prev) => prev.filter((_, i) => i !== idx))}
                  disabled={members.length <= 1}
                >
                  {t('admin.removeMember')}
                </Button>
              </div>
            )
          })}
        </div>
        <div className="plexon-settings-actions">
          <Button
            variant="ghost"
            onClick={() =>
              setMembers((prev) => [...prev, { userId: '', role: COMPANY_USER_ROLE.MEMBER }])
            }
          >
            {t('admin.addMemberRow')}
          </Button>
          <Button variant="primary" onClick={() => void saveMembers()} disabled={savingMembers}>
            {savingMembers ? t('common.loading') : t('admin.saveMembers')}
          </Button>
        </div>
      </section>

      <section className="plexon-settings-section" aria-label={t('admin.projectsTitle')}>
        <SectionChrome title={t('admin.projectsTitle')} />
        <div className="plexon-settings-fields plexon-admin-form-narrow">
          <Field label={t('admin.projectName')}>
            <Input
              block
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
            />
          </Field>
          <Field label={t('admin.projectDomain')}>
            <Input
              block
              value={newProjectDomain}
              onChange={(e) => setNewProjectDomain(e.target.value)}
            />
          </Field>
          <Button
            variant="primary"
            onClick={() => void createProject()}
            disabled={creatingProject || !newProjectName.trim()}
          >
            {creatingProject ? t('common.loading') : t('admin.createProject')}
          </Button>
        </div>

        {projects.length === 0 ? (
          <Text role="meta">—</Text>
        ) : (
          <ul className="plexon-admin-project-list">
            {projects.map((p) => (
              <li key={p.id}>
                <Panel className="plexon-magazine-card">
                  <div className="plexon-admin-project-head">
                    <div>
                      <Text role="title" as="h3">
                        {p.name}
                      </Text>
                      <Text role="meta" className="plexon-admin-mono">
                        {p.id}
                      </Text>
                      <Text role="meta">
                        {t('admin.status')}: {p.status}
                        {p.domain ? ` · ${p.domain}` : ''}
                      </Text>
                    </div>
                    <div className="plexon-settings-actions">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => void syncProject(p.id)}
                        disabled={syncingId === p.id}
                      >
                        {syncingId === p.id ? t('admin.syncing') : t('admin.syncProject')}
                      </Button>
                      <NextLink
                        href={pathPlatformProjectDashboard(p.id)}
                        className="ds-btn ds-btn--ghost ds-btn--sm"
                      >
                        {t('admin.projectDashboard')}
                      </NextLink>
                      <Button variant="danger" size="sm" onClick={() => void deleteProject(p.id)}>
                        {t('admin.deleteProject')}
                      </Button>
                    </div>
                  </div>
                  <Text role="meta">{t('admin.bindings')}</Text>
                  <ul className="plexon-admin-bindings">
                    {(bindingsByProject[p.id] ?? []).map((b) => (
                      <li key={b.productId}>
                        <strong>{b.productId}</strong>: {b.syncStatus}
                        {b.externalProjectId ? ` → ${b.externalProjectId}` : ''}
                        {b.syncMessage ? ` (${b.syncMessage})` : ''}
                      </li>
                    ))}
                  </ul>
                </Panel>
              </li>
            ))}
          </ul>
        )}
      </section>

      {syncMessage ? (
        <section className="plexon-settings-section" aria-label={t('admin.syncResult')}>
          <SectionChrome title={t('admin.syncResult')} quiet as="h3" />
          <pre className="plexon-admin-pre">{syncMessage}</pre>
        </section>
      ) : null}
    </div>
  )
}
