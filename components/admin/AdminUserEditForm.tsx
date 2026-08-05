'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  API_ADMIN_COMPANIES,
  PATH_ADMIN_USERS,
  apiAdminUser,
  apiAdminUserCompanies,
  apiAdminUserEntitlements,
  apiAdminUserProductProjectOptions,
  apiAdminUserProvisioning,
} from '@/lib/constants'
import type { AdminProductProjectOption } from '@/lib/admin-product-project-options'
import { COMPANY_USER_ROLE } from '@/lib/platform-companies'
import type {
  PlatformEntitlementStatus,
  PlatformLaunchContext,
  PlatformProductId,
  PlatformRole,
} from '@/lib/platform-entitlements'
import type { PlatformProductEntryPoint } from '@/lib/platform-products'

type CentralUser = {
  id: string
  email?: string
  name?: string
  company?: string
  locale?: string
  role?: string
  createdAt?: string
}

type AdminCompanyOption = { id: string; name: string; slug: string | null }
type EditOrgRow = { companyId: string; role: string }

type EditableEntitlement = {
  productId: PlatformProductId
  name: string
  lifecycle: string
  surface: string
  defaultAccess: 'granted' | 'hidden'
  source: 'default' | 'explicit'
  status: PlatformEntitlementStatus
  platformRole: PlatformRole
  entryPoints: PlatformProductEntryPoint[]
  defaultContext: PlatformLaunchContext | null
  projectAssignments: Array<{
    projectId: string
    role: 'admin' | 'member'
  }>
  provisioning?: {
    desiredState: 'granted' | 'disabled'
    syncStatus: 'pending' | 'in_sync' | 'failed' | 'disabled' | 'not_supported'
    syncMessage: string | null
    lastAttemptAt: string | null
    lastSucceededAt: string | null
    externalUserRef: string | null
  } | null
}

type ProvisioningActionMode = 'retry' | 'resync'

type AdminUserEditFormProps = {
  userId: string
}

export function AdminUserEditForm({ userId }: AdminUserEditFormProps) {
  const { t } = useI18n()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editLocale, setEditLocale] = useState('de')
  const [editRole, setEditRole] = useState('user')
  const [editEntitlements, setEditEntitlements] = useState<EditableEntitlement[]>([])
  const [editEntitlementsLoading, setEditEntitlementsLoading] = useState(false)
  const [editCompanyMemberships, setEditCompanyMemberships] = useState<EditOrgRow[]>([])
  const [editCompanyMembershipsLoading, setEditCompanyMembershipsLoading] = useState(false)
  const [adminCompaniesCatalog, setAdminCompaniesCatalog] = useState<AdminCompanyOption[]>([])
  const [provisioningAction, setProvisioningAction] = useState<{
    productId: PlatformProductId
    mode: ProvisioningActionMode
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [productProjectOptions, setProductProjectOptions] = useState<
    Partial<Record<'checkion' | 'audion', AdminProductProjectOption[]>>
  >({})
  const [productProjectOptionsLoading, setProductProjectOptionsLoading] = useState(false)

  const localeOptions = useMemo(
    () => [
      { value: 'de', label: 'Deutsch' },
      { value: 'en', label: 'English' },
    ],
    [],
  )

  const roleOptions = useMemo(
    () => [
      { value: 'user', label: t('dashboard.roleUser') },
      { value: 'admin', label: t('dashboard.roleAdmin') },
    ],
    [t],
  )

  const companyRoleOptions = useMemo(
    () => [
      { value: COMPANY_USER_ROLE.OWNER, label: t('admin.roleOwner') },
      { value: COMPANY_USER_ROLE.ADMIN, label: t('admin.roleCompanyAdmin') },
      { value: COMPANY_USER_ROLE.MEMBER, label: t('admin.roleCompanyMember') },
    ],
    [t],
  )

  const formatProvisioningTimestamp = useCallback((value?: string | null) => {
    if (!value) return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
  }, [])

  const projectPickerRowsFor = useCallback(
    (productId: 'checkion' | 'audion', currentValue: string): AdminProductProjectOption[] => {
      const base = productProjectOptions[productId] ?? []
      const trimmed = currentValue.trim()
      if (!trimmed || base.some((o) => o.projectId === trimmed)) return base
      return [
        {
          projectId: trimmed,
          platformProjectId: null,
          platformProjectName: null,
          platformProjectDomain: null,
        },
        ...base,
      ]
    },
    [productProjectOptions],
  )

  const formatProductProjectLabel = useCallback(
    (o: AdminProductProjectOption) => {
      if (o.platformProjectName) {
        return o.platformProjectDomain
          ? `${o.platformProjectName} · ${o.platformProjectDomain}`
          : o.platformProjectName
      }
      return t('dashboard.productProjectPickerLegacyId', { id: o.projectId })
    },
    [t],
  )

  const loadUserEntitlements = useCallback(
    async (id: string) => {
      setEditEntitlementsLoading(true)
      try {
        const res = await fetch(apiAdminUserEntitlements(id), { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data?.error ?? 'Failed to load entitlements')
          setEditEntitlements([])
          return
        }
        setEditEntitlements(Array.isArray(data?.items) ? (data.items as EditableEntitlement[]) : [])
      } catch {
        setError(t('dashboard.loadError'))
        setEditEntitlements([])
      } finally {
        setEditEntitlementsLoading(false)
      }
    },
    [t],
  )

  const loadUserCompanyMemberships = useCallback(
    async (id: string) => {
      setEditCompanyMembershipsLoading(true)
      try {
        const res = await fetch(apiAdminUserCompanies(id), {
          cache: 'no-store',
          credentials: 'same-origin',
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data?.error ?? 'Failed to load organizations')
          setEditCompanyMemberships([])
          return
        }
        const items = Array.isArray(data?.items) ? data.items : []
        setEditCompanyMemberships(
          items.map((row: { companyId?: string; role?: string }) => ({
            companyId: typeof row.companyId === 'string' ? row.companyId : '',
            role: typeof row.role === 'string' ? row.role : COMPANY_USER_ROLE.MEMBER,
          })),
        )
      } catch {
        setError(t('dashboard.loadError'))
        setEditCompanyMemberships([])
      } finally {
        setEditCompanyMembershipsLoading(false)
      }
    },
    [t],
  )

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const res = await fetch(apiAdminUser(userId), {
          credentials: 'same-origin',
          cache: 'no-store',
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setError((data as { error?: string }).error ?? t('dashboard.loadError'))
          setLoading(false)
          return
        }
        const u = (data?.user ?? data?.data ?? data) as CentralUser
        if (!u?.id && !u?.email) {
          setError(t('dashboard.loadError'))
          setLoading(false)
          return
        }
        setEditName(u.name ?? '')
        setEditEmail(u.email ?? '')
        setEditCompany(u.company ?? '')
        setEditLocale(u.locale ?? 'de')
        setEditRole(u.role ?? 'user')
        void loadUserEntitlements(userId)
        void loadUserCompanyMemberships(userId)
      } catch {
        if (!cancelled) setError(t('dashboard.loadError'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId, t, loadUserEntitlements, loadUserCompanyMemberships])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(API_ADMIN_COMPANIES, { credentials: 'same-origin' })
        const data = await res.json().catch(() => ({}))
        if (cancelled || !res.ok) return
        const items = Array.isArray(data?.items) ? data.items : []
        setAdminCompaniesCatalog(
          items
            .map((row: { id?: string; name?: string; slug?: string | null }) => ({
              id: String(row.id ?? ''),
              name: String(row.name ?? ''),
              slug: row.slug ?? null,
            }))
            .filter((c: AdminCompanyOption) => c.id && c.name),
        )
      } catch {
        /* ignore catalog errors; save will still surface API errors */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setProductProjectOptions({})
      setProductProjectOptionsLoading(false)
      return
    }
    let cancelled = false
    setProductProjectOptionsLoading(true)
    void (async () => {
      try {
        const [chkRes, audRes] = await Promise.all([
          fetch(apiAdminUserProductProjectOptions(userId, 'checkion'), {
            credentials: 'same-origin',
            cache: 'no-store',
          }),
          fetch(apiAdminUserProductProjectOptions(userId, 'audion'), {
            credentials: 'same-origin',
            cache: 'no-store',
          }),
        ])
        const chk = await chkRes.json().catch(() => ({}))
        const aud = await audRes.json().catch(() => ({}))
        if (cancelled) return
        setProductProjectOptions({
          checkion: chkRes.ok && Array.isArray(chk?.items) ? (chk.items as AdminProductProjectOption[]) : [],
          audion: audRes.ok && Array.isArray(aud?.items) ? (aud.items as AdminProductProjectOption[]) : [],
        })
      } catch {
        if (!cancelled) setProductProjectOptions({})
      } finally {
        if (!cancelled) setProductProjectOptionsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  const updateEntitlement = useCallback(
    (productId: PlatformProductId, updater: (current: EditableEntitlement) => EditableEntitlement) => {
      setEditEntitlements((current) =>
        current.map((item) => (item.productId === productId ? updater(item) : item)),
      )
    },
    [],
  )

  const addProjectAssignment = useCallback(
    (productId: PlatformProductId) => {
      updateEntitlement(productId, (current) => ({
        ...current,
        projectAssignments: [...(current.projectAssignments ?? []), { projectId: '', role: 'member' }],
      }))
    },
    [updateEntitlement],
  )

  const updateProjectAssignment = useCallback(
    (
      productId: PlatformProductId,
      index: number,
      updater: (current: { projectId: string; role: 'admin' | 'member' }) => {
        projectId: string
        role: 'admin' | 'member'
      },
    ) => {
      updateEntitlement(productId, (current) => ({
        ...current,
        projectAssignments: (current.projectAssignments ?? []).map((assignment, assignmentIndex) =>
          assignmentIndex === index ? updater(assignment) : assignment,
        ),
      }))
    },
    [updateEntitlement],
  )

  const removeProjectAssignment = useCallback(
    (productId: PlatformProductId, index: number) => {
      updateEntitlement(productId, (current) => ({
        ...current,
        projectAssignments: (current.projectAssignments ?? []).filter(
          (_assignment, assignmentIndex) => assignmentIndex !== index,
        ),
      }))
    },
    [updateEntitlement],
  )

  const runProvisioningAction = useCallback(
    async (productId: PlatformProductId, mode: ProvisioningActionMode) => {
      if (!userId) return
      setProvisioningAction({ productId, mode })
      try {
        const res = await fetch(apiAdminUserProvisioning(userId), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode, productIds: [productId] }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data?.error ?? 'Provisioning action failed')
          return
        }
        await loadUserEntitlements(userId)
      } catch {
        setError(t('dashboard.loadError'))
      } finally {
        setProvisioningAction(null)
      }
    },
    [userId, loadUserEntitlements, t],
  )

  const handleSaveEdit = async () => {
    if (!userId) return
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        name: editName.trim() || undefined,
        email: editEmail.trim() || undefined,
        company: editCompany.trim() || undefined,
        locale: editLocale || undefined,
        role: editRole,
      }
      const res = await fetch(apiAdminUser(userId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? 'Update failed')
        return
      }

      const orgItems = editCompanyMemberships
        .filter((m) => m.companyId.trim())
        .map((m) => ({ companyId: m.companyId.trim(), role: m.role }))
      const orgRes = await fetch(apiAdminUserCompanies(userId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ items: orgItems }),
      })
      const orgData = await orgRes.json().catch(() => ({}))
      if (!orgRes.ok) {
        setError(orgData?.error ?? 'Organizations update failed')
        return
      }

      const entitlementRes = await fetch(apiAdminUserEntitlements(userId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: editEntitlements.map((item) => ({
            productId: item.productId,
            status: item.status,
            platformRole: item.platformRole,
            defaultContext: item.defaultContext,
            projectAssignments: (item.projectAssignments ?? [])
              .map((assignment) => ({
                projectId: assignment.projectId.trim(),
                role: assignment.role,
              }))
              .filter((assignment) => assignment.projectId),
          })),
        }),
      })
      const entitlementData = await entitlementRes.json().catch(() => ({}))
      if (!entitlementRes.ok) {
        setError(entitlementData?.error ?? 'Entitlements update failed')
        return
      }

      router.push(PATH_ADMIN_USERS)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!userId) return
    if (!window.confirm(t('dashboard.deleteUserConfirm'))) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(apiAdminUser(userId), { method: 'DELETE', credentials: 'same-origin' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? 'Delete failed')
        return
      }
      router.push(PATH_ADMIN_USERS)
    } catch {
      setError(t('dashboard.loadError'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Text role="meta">
        <Spinner size="sm" /> {t('common.loading')}
      </Text>
    )
  }

  return (
    <div className="plexon-admin-stack">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <section className="plexon-settings-section" aria-labelledby="edit-user-title">
        <SectionChrome title={t('dashboard.editUser')} />
        <div className="plexon-settings-fields plexon-admin-form-narrow">
          <Field label={t('dashboard.email')}>
            <Input block value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
          </Field>
          <Field label={t('dashboard.name')}>
            <Input block value={editName} onChange={(e) => setEditName(e.target.value)} />
          </Field>
          <Field label={t('dashboard.company')}>
            <Input block value={editCompany} onChange={(e) => setEditCompany(e.target.value)} />
          </Field>
          <Text role="meta">{t('dashboard.companyProfileHint')}</Text>
          <Field label={t('dashboard.locale')}>
            <Select options={localeOptions} value={editLocale} onChange={setEditLocale} />
          </Field>
          <Field label={t('dashboard.role')}>
            <Select options={roleOptions} value={editRole} onChange={setEditRole} />
          </Field>
        </div>
      </section>

      <section className="plexon-settings-section" aria-label={t('dashboard.organizationsTitle')}>
        <SectionChrome
          title={t('dashboard.organizationsTitle')}
          meta={<Text role="meta">{t('dashboard.organizationsSubtitle')}</Text>}
        />
        {editCompanyMembershipsLoading ? (
          <Text role="meta">{t('common.loading')}</Text>
        ) : (
          <div className="plexon-admin-member-rows">
            {editCompanyMemberships.map((row, idx) => {
              const takenElsewhere = new Set(
                editCompanyMemberships
                  .map((m, mi) => (mi !== idx && m.companyId.trim() ? m.companyId : null))
                  .filter(Boolean) as string[],
              )
              const selectOptions = adminCompaniesCatalog.filter((c) => !takenElsewhere.has(c.id))
              const orgOptions = [
                { value: '', label: '—' },
                ...selectOptions.map((c) => ({
                  value: c.id,
                  label: `${c.name}${c.slug ? ` (${c.slug})` : ''}`,
                })),
                ...(row.companyId.trim() && !adminCompaniesCatalog.some((c) => c.id === row.companyId)
                  ? [{ value: row.companyId, label: row.companyId }]
                  : []),
              ]
              return (
                <div key={idx} className="plexon-admin-member-row">
                  <Field label={t('dashboard.organizationSelect')}>
                    <Select
                      options={orgOptions}
                      value={row.companyId}
                      onChange={(v) => {
                        setEditCompanyMemberships((prev) =>
                          prev.map((m, i) => (i === idx ? { ...m, companyId: v } : m)),
                        )
                      }}
                    />
                  </Field>
                  <Field label={t('admin.memberRole')}>
                    <Select
                      options={companyRoleOptions}
                      value={row.role}
                      onChange={(v) => {
                        setEditCompanyMemberships((prev) =>
                          prev.map((m, i) => (i === idx ? { ...m, role: v } : m)),
                        )
                      }}
                    />
                  </Field>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setEditCompanyMemberships((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    {t('dashboard.delete')}
                  </Button>
                </div>
              )
            })}
            <div className="plexon-settings-actions">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setEditCompanyMemberships((prev) => [
                    ...prev,
                    { companyId: '', role: COMPANY_USER_ROLE.MEMBER },
                  ])
                }
              >
                {t('dashboard.addOrganizationRow')}
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="plexon-settings-section" aria-label={t('dashboard.entitlementsTitle')}>
        <SectionChrome
          title={t('dashboard.entitlementsTitle')}
          meta={<Text role="meta">{t('dashboard.entitlementsSubtitle')}</Text>}
        />
        {editEntitlementsLoading ? (
          <Text role="meta">{t('common.loading')}</Text>
        ) : (
          <div className="plexon-admin-project-list">
            {editEntitlements.map((entitlement) => {
              const statusOptions = [
                { value: 'active', label: t('dashboard.entitlementActive') },
                { value: 'disabled', label: t('dashboard.entitlementDisabled') },
              ]
              const platformRoleOptions = [
                { value: 'member', label: t('dashboard.platformRoleMember') },
                { value: 'manager', label: t('dashboard.platformRoleManager') },
                { value: 'admin', label: t('dashboard.platformRoleAdmin') },
              ]
              const entryPointOptions = [
                { value: '', label: t('dashboard.entitlementEntryPointDefault') },
                ...entitlement.entryPoints.map((ep) => ({
                  value: ep.id,
                  label: t(ep.labelKey),
                })),
              ]
              const productWithProjectsId =
                entitlement.productId === 'checkion' || entitlement.productId === 'audion'
                  ? entitlement.productId
                  : null
              const projectOptions = productWithProjectsId
                ? [
                    { value: '', label: t('dashboard.productProjectPickerPlaceholder') },
                    ...projectPickerRowsFor(
                      productWithProjectsId,
                      entitlement.defaultContext?.projectId ?? '',
                    ).map((opt) => ({
                      value: opt.projectId,
                      label: formatProductProjectLabel(opt),
                    })),
                  ]
                : []

              return (
                <Panel key={entitlement.productId} className="plexon-admin-entitlement-card">
                  <div className="plexon-admin-project-head">
                    <div>
                      <Text role="title" as="h3">
                        {entitlement.name}
                      </Text>
                      <Text role="meta">
                        {entitlement.source === 'explicit'
                          ? t('dashboard.entitlementExplicit')
                          : entitlement.defaultAccess === 'granted'
                            ? t('dashboard.entitlementDefaultGranted')
                            : t('dashboard.entitlementDefaultHidden')}
                      </Text>
                    </div>
                    <Text role="meta">{entitlement.lifecycle}</Text>
                  </div>

                  <div className="plexon-settings-fields">
                    <div className="plexon-admin-member-row">
                      <Field label={t('dashboard.entitlementStatus')}>
                        <Select
                          options={statusOptions}
                          value={entitlement.status}
                          onChange={(v) =>
                            updateEntitlement(entitlement.productId, (current) => ({
                              ...current,
                              status: v as PlatformEntitlementStatus,
                            }))
                          }
                        />
                      </Field>
                      <Field label={t('dashboard.entitlementPlatformRole')}>
                        <Select
                          options={platformRoleOptions}
                          value={entitlement.platformRole}
                          onChange={(v) =>
                            updateEntitlement(entitlement.productId, (current) => ({
                              ...current,
                              platformRole: v as PlatformRole,
                            }))
                          }
                        />
                      </Field>
                    </div>

                    <Field label={t('dashboard.entitlementEntryPoint')}>
                      <Select
                        options={entryPointOptions}
                        value={entitlement.defaultContext?.entryPointId ?? ''}
                        onChange={(v) =>
                          updateEntitlement(entitlement.productId, (current) => ({
                            ...current,
                            defaultContext: {
                              ...(current.defaultContext ?? {}),
                              entryPointId: v || null,
                            },
                          }))
                        }
                      />
                    </Field>

                    <div className="plexon-admin-member-row">
                      {productWithProjectsId ? (
                        <Field label={t('dashboard.entitlementProjectId')}>
                          <Select
                            options={projectOptions}
                            value={entitlement.defaultContext?.projectId ?? ''}
                            onChange={(v) =>
                              updateEntitlement(entitlement.productId, (current) => ({
                                ...current,
                                defaultContext: {
                                  ...(current.defaultContext ?? {}),
                                  projectId: v || null,
                                },
                              }))
                            }
                            disabled={productProjectOptionsLoading}
                          />
                          {!productProjectOptionsLoading &&
                          (productProjectOptions[productWithProjectsId]?.length ?? 0) === 0 ? (
                            <Text role="meta">{t('dashboard.productProjectPickerEmptyBound')}</Text>
                          ) : null}
                          <Text role="meta">{t('dashboard.productProjectPickerConcept')}</Text>
                        </Field>
                      ) : (
                        <Field label={t('dashboard.entitlementProjectId')}>
                          <Input
                            block
                            value={entitlement.defaultContext?.projectId ?? ''}
                            onChange={(e) =>
                              updateEntitlement(entitlement.productId, (current) => ({
                                ...current,
                                defaultContext: {
                                  ...(current.defaultContext ?? {}),
                                  projectId: e.target.value || null,
                                },
                              }))
                            }
                          />
                        </Field>
                      )}
                      <Field label={t('dashboard.entitlementDeepLink')}>
                        <Input
                          block
                          value={entitlement.defaultContext?.deepLink ?? ''}
                          onChange={(e) =>
                            updateEntitlement(entitlement.productId, (current) => ({
                              ...current,
                              defaultContext: {
                                ...(current.defaultContext ?? {}),
                                deepLink: e.target.value || null,
                              },
                            }))
                          }
                        />
                      </Field>
                    </div>

                    {productWithProjectsId ? (
                      <div className="plexon-admin-bindings">
                        <div className="plexon-admin-project-head">
                          <div>
                            <Text role="title" as="h4">
                              {t('dashboard.projectAssignmentsTitle')}
                            </Text>
                            <Text role="meta">
                              {t('dashboard.projectAssignmentsSubtitle', { product: entitlement.name })}
                            </Text>
                            <Text role="meta">{t('dashboard.productProjectPickerConcept')}</Text>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => addProjectAssignment(entitlement.productId)}
                            disabled={saving || Boolean(provisioningAction)}
                          >
                            {t('dashboard.projectAssignmentsAdd')}
                          </Button>
                        </div>
                        {!productProjectOptionsLoading &&
                        (productProjectOptions[productWithProjectsId]?.length ?? 0) === 0 ? (
                          <Text role="meta">{t('dashboard.productProjectPickerEmptyBound')}</Text>
                        ) : null}
                        {(entitlement.projectAssignments ?? []).map((assignment, assignmentIndex) => {
                          const assignmentProjectOptions = [
                            { value: '', label: t('dashboard.productProjectPickerPlaceholder') },
                            ...projectPickerRowsFor(productWithProjectsId, assignment.projectId).map(
                              (opt) => ({
                                value: opt.projectId,
                                label: formatProductProjectLabel(opt),
                              }),
                            ),
                          ]
                          const assignmentRoleOptions = [
                            { value: 'member', label: t('dashboard.projectAssignmentRoleMember') },
                            { value: 'admin', label: t('dashboard.projectAssignmentRoleAdmin') },
                          ]
                          return (
                            <div
                              key={`${entitlement.productId}-assignment-${assignmentIndex}`}
                              className="plexon-admin-member-row"
                            >
                              <Field label={t('dashboard.projectAssignmentsProjectId')}>
                                <Select
                                  options={assignmentProjectOptions}
                                  value={assignment.projectId}
                                  onChange={(v) =>
                                    updateProjectAssignment(
                                      entitlement.productId,
                                      assignmentIndex,
                                      (current) => ({ ...current, projectId: v }),
                                    )
                                  }
                                  disabled={productProjectOptionsLoading}
                                />
                              </Field>
                              <Field label={t('dashboard.projectAssignmentsRole')}>
                                <Select
                                  options={assignmentRoleOptions}
                                  value={assignment.role}
                                  onChange={(v) =>
                                    updateProjectAssignment(
                                      entitlement.productId,
                                      assignmentIndex,
                                      (current) => ({
                                        ...current,
                                        role: v as 'admin' | 'member',
                                      }),
                                    )
                                  }
                                />
                              </Field>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  removeProjectAssignment(entitlement.productId, assignmentIndex)
                                }
                                disabled={saving || Boolean(provisioningAction)}
                              >
                                {t('dashboard.projectAssignmentsRemove')}
                              </Button>
                            </div>
                          )
                        })}
                        {(entitlement.projectAssignments ?? []).length === 0 ? (
                          <Text role="meta">{t('dashboard.projectAssignmentsEmpty')}</Text>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="plexon-admin-bindings">
                      <div className="plexon-admin-project-head">
                        <Text role="title" as="h4">
                          {t('dashboard.provisioningTitle')}
                        </Text>
                        <Text role="meta">
                          {t(
                            `dashboard.provisioningStatus.${entitlement.provisioning?.syncStatus ?? 'pending'}`,
                          )}
                        </Text>
                      </div>
                      <div className="plexon-settings-actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void runProvisioningAction(entitlement.productId, 'retry')}
                          disabled={Boolean(provisioningAction) || saving || editEntitlementsLoading}
                        >
                          {provisioningAction?.productId === entitlement.productId &&
                          provisioningAction.mode === 'retry'
                            ? t('dashboard.provisioningRetrying')
                            : t('dashboard.provisioningRetry')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void runProvisioningAction(entitlement.productId, 'resync')}
                          disabled={Boolean(provisioningAction) || saving || editEntitlementsLoading}
                        >
                          {provisioningAction?.productId === entitlement.productId &&
                          provisioningAction.mode === 'resync'
                            ? t('dashboard.provisioningResyncing')
                            : t('dashboard.provisioningResync')}
                        </Button>
                      </div>
                      {entitlement.provisioning?.syncMessage ? (
                        <Text role="meta">{entitlement.provisioning.syncMessage}</Text>
                      ) : null}
                      <Text role="meta">
                        {t('dashboard.provisioningDesiredState')}:{' '}
                        {t(
                          `dashboard.provisioningDesired.${entitlement.provisioning?.desiredState ?? 'granted'}`,
                        )}
                      </Text>
                      {entitlement.provisioning?.externalUserRef ? (
                        <Text role="meta">
                          {t('dashboard.provisioningExternalUserRef')}:{' '}
                          {entitlement.provisioning.externalUserRef}
                        </Text>
                      ) : null}
                      {formatProvisioningTimestamp(entitlement.provisioning?.lastAttemptAt) ? (
                        <Text role="meta">
                          {t('dashboard.provisioningLastAttempt')}:{' '}
                          {formatProvisioningTimestamp(entitlement.provisioning?.lastAttemptAt)}
                        </Text>
                      ) : null}
                      {formatProvisioningTimestamp(entitlement.provisioning?.lastSucceededAt) ? (
                        <Text role="meta">
                          {t('dashboard.provisioningLastSuccess')}:{' '}
                          {formatProvisioningTimestamp(entitlement.provisioning?.lastSucceededAt)}
                        </Text>
                      ) : null}
                    </div>
                  </div>
                </Panel>
              )
            })}
          </div>
        )}
      </section>

      <div className="plexon-settings-actions">
        <Button
          variant="danger"
          onClick={() => void handleDelete()}
          disabled={saving || Boolean(provisioningAction)}
        >
          {t('dashboard.delete')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => router.push(PATH_ADMIN_USERS)}
          disabled={saving || Boolean(provisioningAction)}
        >
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={() => void handleSaveEdit()}
          disabled={
            saving ||
            editEntitlementsLoading ||
            editCompanyMembershipsLoading ||
            Boolean(provisioningAction)
          }
        >
          {saving ? t('dashboard.saving') : t('common.save')}
        </Button>
      </div>
    </div>
  )
}
