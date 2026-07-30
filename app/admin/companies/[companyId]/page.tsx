'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import NextLink from 'next/link';
import { useParams } from 'next/navigation';
import { Box, Stack } from '@mui/material';
import { MsqdxTypography, MsqdxCard, MsqdxButton, MsqdxFormField } from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import {
  API_ADMIN_USERS,
  apiAdminCompany,
  apiAdminCompanyMembers,
  apiAdminCompanyPlatformProjects,
  apiAdminPlatformProject,
  apiAdminPlatformProjectSync,
  PATH_ADMIN_COMPANIES,
  pathPlatformProjectDashboard,
} from '@/lib/constants';
import { COMPANY_USER_ROLE, type CompanyUserRole } from '@/lib/platform-companies';

type Company = { id: string; name: string; slug: string | null; createdAt: string; updatedAt: string };
/** API rows include companyId; placeholder rows for the form omit it. */
type MemberRow = { companyId?: string; userId: string; role: string; createdAt?: string; updatedAt?: string };
type PlatformProject = {
  id: string;
  companyId: string;
  name: string;
  domain: string | null;
  status: string;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};
type Binding = {
  platformProjectId: string;
  productId: string;
  externalProjectId: string | null;
  syncStatus: string;
  syncMessage: string | null;
  lastSyncAt: string | null;
};

type DirectoryUser = { id: string; email?: string; name?: string };

export default function AdminCompanyDetailPage() {
  const params = useParams<{ companyId: string }>();
  const companyId = params.companyId as string;
  const { t } = useI18n();

  const [company, setCompany] = useState<Company | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [members, setMembers] = useState<MemberRow[]>([{ userId: '', role: COMPANY_USER_ROLE.MEMBER }]);
  const [projects, setProjects] = useState<PlatformProject[]>([]);
  const [bindingsByProject, setBindingsByProject] = useState<Record<string, Binding[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingMembers, setSavingMembers] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDomain, setNewProjectDomain] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [userDirectory, setUserDirectory] = useState<DirectoryUser[]>([]);
  const [memberDirectoryFilter, setMemberDirectoryFilter] = useState('');

  const filteredUserDirectory = useMemo(() => {
    const s = memberDirectoryFilter.trim().toLowerCase();
    const base = !s
      ? userDirectory
      : userDirectory.filter(
          (u) =>
            u.id.toLowerCase().includes(s) ||
            (u.email ?? '').toLowerCase().includes(s) ||
            (u.name ?? '').toLowerCase().includes(s)
        );
    return [...base].sort((a, b) =>
      (a.email ?? a.name ?? a.id).localeCompare(b.email ?? b.name ?? b.id, undefined, { sensitivity: 'base' })
    );
  }, [userDirectory, memberDirectoryFilter]);

  const loadBindings = useCallback(
    async (list: PlatformProject[]) => {
      const next: Record<string, Binding[]> = {};
      await Promise.all(
        list.map(async (p) => {
          try {
            const res = await fetch(apiAdminPlatformProject(p.id), { credentials: 'same-origin' });
            const data = await res.json().catch(() => ({}));
            if (res.ok && Array.isArray(data.bindings)) {
              next[p.id] = data.bindings as Binding[];
            } else {
              next[p.id] = [];
            }
          } catch {
            next[p.id] = [];
          }
        })
      );
      setBindingsByProject(next);
    },
    []
  );

  const loadAll = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const [cRes, mRes, pRes, uRes] = await Promise.all([
        fetch(apiAdminCompany(companyId), { credentials: 'same-origin' }),
        fetch(apiAdminCompanyMembers(companyId), { credentials: 'same-origin' }),
        fetch(apiAdminCompanyPlatformProjects(companyId), { credentials: 'same-origin' }),
        fetch(API_ADMIN_USERS, { credentials: 'same-origin' }),
      ]);
      const cData = await cRes.json().catch(() => ({}));
      if (!cRes.ok) {
        setError((cData as { error?: string }).error ?? t('admin.loadError'));
        setCompany(null);
        setUserDirectory([]);
        return;
      }
      const co = cData as Company;
      setCompany(co);
      setEditName(co.name);
      setEditSlug(co.slug ?? '');

      const mData = await mRes.json().catch(() => ({}));
      const mItems = Array.isArray(mData.items) ? (mData.items as MemberRow[]) : [];
      setMembers(mItems.length > 0 ? mItems : [{ userId: '', role: COMPANY_USER_ROLE.MEMBER }]);

      const pData = await pRes.json().catch(() => ({}));
      const plist = Array.isArray(pData.items) ? (pData.items as PlatformProject[]) : [];
      setProjects(plist);
      await loadBindings(plist);

      const uData = await uRes.json().catch(() => ({}));
      if (uRes.ok && Array.isArray(uData.data)) {
        setUserDirectory(
          uData.data
            .map((row: { id?: string; email?: string; name?: string }) => ({
              id: String(row.id ?? ''),
              email: typeof row.email === 'string' ? row.email : undefined,
              name: typeof row.name === 'string' ? row.name : undefined,
            }))
            .filter((u: DirectoryUser) => u.id)
        );
      } else {
        setUserDirectory([]);
      }
    } catch {
      setError(t('admin.loadError'));
    } finally {
      setLoading(false);
    }
  }, [companyId, t, loadBindings]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const saveCompany = async () => {
    if (!companyId) return;
    setSavingCompany(true);
    setError(null);
    try {
      const res = await fetch(apiAdminCompany(companyId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: editName.trim(),
          slug: editSlug.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? t('admin.loadError'));
        return;
      }
      setCompany(data as Company);
    } finally {
      setSavingCompany(false);
    }
  };

  const saveMembers = async () => {
    if (!companyId) return;
    setSavingMembers(true);
    setError(null);
    try {
      const items = members
        .filter((m) => m.userId.trim())
        .map((m) => ({
          userId: m.userId.trim(),
          role: m.role as CompanyUserRole,
        }));
      const res = await fetch(apiAdminCompanyMembers(companyId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ items }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? t('admin.loadError'));
        return;
      }
      const mItems = Array.isArray(data.items) ? (data.items as MemberRow[]) : [];
      setMembers(mItems.length > 0 ? mItems : [{ userId: '', role: COMPANY_USER_ROLE.MEMBER }]);
    } finally {
      setSavingMembers(false);
    }
  };

  const createProject = async () => {
    if (!companyId || !newProjectName.trim()) return;
    setCreatingProject(true);
    setError(null);
    try {
      const res = await fetch(apiAdminCompanyPlatformProjects(companyId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: newProjectName.trim(),
          domain: newProjectDomain.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? t('admin.loadError'));
        return;
      }
      setNewProjectName('');
      setNewProjectDomain('');
      await loadAll();
    } finally {
      setCreatingProject(false);
    }
  };

  const syncProject = async (platformProjectId: string) => {
    setSyncingId(platformProjectId);
    setSyncMessage(null);
    setError(null);
    try {
      const res = await fetch(apiAdminPlatformProjectSync(platformProjectId), {
        method: 'POST',
        credentials: 'same-origin',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? t('admin.loadError'));
        return;
      }
      setSyncMessage(JSON.stringify(data.results ?? data, null, 2));
      await loadAll();
    } finally {
      setSyncingId(null);
    }
  };

  const deleteProject = async (platformProjectId: string) => {
    if (!window.confirm(t('admin.deleteProjectConfirm'))) return;
    setError(null);
    try {
      const res = await fetch(apiAdminPlatformProject(platformProjectId), {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? t('admin.loadError'));
        return;
      }
      await loadAll();
    } catch {
      setError(t('admin.loadError'));
    }
  };

  if (loading && !company) {
    return (
      <MsqdxTypography variant="body2" color="text.secondary">
        {t('common.loading')}
      </MsqdxTypography>
    );
  }

  if (!company) {
    return (
      <Stack spacing={2}>
        <MsqdxTypography variant="body2" color="error">
          {error ?? t('admin.loadError')}
        </MsqdxTypography>
        <NextLink href={PATH_ADMIN_COMPANIES}>{t('admin.back')}</NextLink>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <NextLink href={PATH_ADMIN_COMPANIES} style={{ fontSize: '0.875rem' }}>
        ← {t('admin.back')}
      </NextLink>

      {error && (
        <MsqdxTypography variant="body2" color="error">
          {error}
        </MsqdxTypography>
      )}

      <MsqdxCard
        variant="flat"
        borderRadius="button"
        sx={{ p: 'var(--msqdx-spacing-md)', border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: 'var(--color-card-bg)' }}
      >
        <MsqdxTypography variant="h6" weight="semibold" sx={{ mb: 2 }}>
          {t('admin.editCompany')}
        </MsqdxTypography>
        <Stack spacing={2} sx={{ maxWidth: 520 }}>
          <MsqdxFormField label={t('admin.companyName')} value={editName} onChange={(e) => setEditName((e.target as HTMLInputElement).value)} fullWidth />
          <MsqdxFormField label={t('admin.companySlug')} value={editSlug} onChange={(e) => setEditSlug((e.target as HTMLInputElement).value)} fullWidth />
          <MsqdxButton variant="contained" onClick={() => void saveCompany()} disabled={savingCompany}>
            {savingCompany ? t('common.loading') : t('admin.saveCompany')}
          </MsqdxButton>
        </Stack>
      </MsqdxCard>

      <MsqdxCard
        variant="flat"
        borderRadius="button"
        sx={{ p: 'var(--msqdx-spacing-md)', border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: 'var(--color-card-bg)' }}
      >
        <MsqdxTypography variant="h6" weight="semibold" sx={{ mb: 1 }}>
          {t('admin.membersTitle')}
        </MsqdxTypography>
        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-secondary)', display: 'block', mb: 2 }}>
          {t('admin.membersRolesHint')}
        </MsqdxTypography>
        <MsqdxFormField
          label={t('admin.memberDirectoryFilter')}
          value={memberDirectoryFilter}
          onChange={(e) => setMemberDirectoryFilter((e.target as HTMLInputElement).value)}
          fullWidth
          sx={{ mb: 2, maxWidth: 480 }}
        />
        <Stack spacing={2}>
          {members.map((m, idx) => {
            const uid = m.userId.trim();
            const takenElsewhere = new Set(
              members.map((row, mi) => (mi !== idx && row.userId.trim() ? row.userId.trim() : '')).filter(Boolean)
            );
            const pickable = filteredUserDirectory.filter((u) => !takenElsewhere.has(u.id) || u.id === uid);
            const orphanId = Boolean(uid && !userDirectory.some((u) => u.id === uid));
            return (
              <Stack key={idx} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'flex-end' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <MsqdxTypography variant="caption" sx={{ mb: 0.5, display: 'block' }}>
                    {t('admin.memberUserPick')}
                  </MsqdxTypography>
                  <select
                    value={m.userId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setMembers((prev) => prev.map((row, i) => (i === idx ? { ...row, userId: v } : row)));
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--msqdx-radius-sm)',
                      border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                    }}
                  >
                    <option value="">—</option>
                    {orphanId ? (
                      <option value={uid}>
                        {uid} ({t('admin.memberUserId')})
                      </option>
                    ) : null}
                    {pickable.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.email ?? u.name ?? u.id}
                        {u.name && u.email ? ` · ${u.name}` : ''}
                      </option>
                    ))}
                  </select>
                </Box>
                <Box sx={{ minWidth: { sm: 160 } }}>
                  <MsqdxTypography variant="caption" sx={{ mb: 0.5 }}>
                    {t('admin.memberRole')}
                  </MsqdxTypography>
                  <select
                    value={m.role}
                    onChange={(e) => {
                      const v = e.target.value;
                      setMembers((prev) => prev.map((row, i) => (i === idx ? { ...row, role: v } : row)));
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--msqdx-radius-sm)',
                      border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                    }}
                  >
                    <option value={COMPANY_USER_ROLE.OWNER}>{t('admin.roleOwner')}</option>
                    <option value={COMPANY_USER_ROLE.ADMIN}>{t('admin.roleCompanyAdmin')}</option>
                    <option value={COMPANY_USER_ROLE.MEMBER}>{t('admin.roleCompanyMember')}</option>
                  </select>
                </Box>
                <MsqdxButton
                  variant="outlined"
                  size="small"
                  onClick={() => setMembers((prev) => prev.filter((_, i) => i !== idx))}
                  disabled={members.length <= 1}
                >
                  {t('admin.removeMember')}
                </MsqdxButton>
              </Stack>
            );
          })}
          <Stack direction="row" spacing={1}>
            <MsqdxButton variant="outlined" onClick={() => setMembers((prev) => [...prev, { userId: '', role: COMPANY_USER_ROLE.MEMBER }])}>
              {t('admin.addMemberRow')}
            </MsqdxButton>
            <MsqdxButton variant="contained" onClick={() => void saveMembers()} disabled={savingMembers}>
              {savingMembers ? t('common.loading') : t('admin.saveMembers')}
            </MsqdxButton>
          </Stack>
        </Stack>
      </MsqdxCard>

      <MsqdxCard
        variant="flat"
        borderRadius="button"
        sx={{ p: 'var(--msqdx-spacing-md)', border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: 'var(--color-card-bg)' }}
      >
        <MsqdxTypography variant="h6" weight="semibold" sx={{ mb: 2 }}>
          {t('admin.projectsTitle')}
        </MsqdxTypography>
        <Stack spacing={2} sx={{ maxWidth: 520, mb: 3 }}>
          <MsqdxFormField label={t('admin.projectName')} value={newProjectName} onChange={(e) => setNewProjectName((e.target as HTMLInputElement).value)} fullWidth />
          <MsqdxFormField label={t('admin.projectDomain')} value={newProjectDomain} onChange={(e) => setNewProjectDomain((e.target as HTMLInputElement).value)} fullWidth />
          <MsqdxButton variant="contained" onClick={() => void createProject()} disabled={creatingProject || !newProjectName.trim()}>
            {creatingProject ? t('common.loading') : t('admin.createProject')}
          </MsqdxButton>
        </Stack>

        {projects.length === 0 ? (
          <MsqdxTypography variant="body2" color="text.secondary">
            —
          </MsqdxTypography>
        ) : (
          <Stack spacing={2}>
            {projects.map((p) => (
              <Box
                key={p.id}
                sx={{
                  p: 2,
                  borderRadius: 'var(--msqdx-radius-md)',
                  border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                  bgcolor: 'var(--color-bg-subtle)',
                }}
              >
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'flex-start' }}>
                  <Box>
                    <MsqdxTypography variant="subtitle1" weight="semibold">
                      {p.name}
                    </MsqdxTypography>
                    <MsqdxTypography variant="caption" sx={{ fontFamily: 'monospace', display: 'block' }}>
                      {p.id}
                    </MsqdxTypography>
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                      {t('admin.status')}: {p.status}
                      {p.domain ? ` · ${p.domain}` : ''}
                    </MsqdxTypography>
                  </Box>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    <MsqdxButton
                      variant="contained"
                      size="small"
                      onClick={() => void syncProject(p.id)}
                      disabled={syncingId === p.id}
                    >
                      {syncingId === p.id ? t('admin.syncing') : t('admin.syncProject')}
                    </MsqdxButton>
                    <NextLink href={pathPlatformProjectDashboard(p.id)} style={{ textDecoration: 'none' }}>
                      <MsqdxButton variant="outlined" size="small">
                        {t('admin.projectDashboard')}
                      </MsqdxButton>
                    </NextLink>
                    <MsqdxButton variant="outlined" size="small" color="error" onClick={() => void deleteProject(p.id)}>
                      {t('admin.deleteProject')}
                    </MsqdxButton>
                  </Stack>
                </Stack>
                <MsqdxTypography variant="caption" weight="semibold" sx={{ display: 'block', mt: 1.5, mb: 0.5 }}>
                  {t('admin.bindings')}
                </MsqdxTypography>
                <Stack component="ul" sx={{ m: 0, pl: 2 }}>
                  {(bindingsByProject[p.id] ?? []).map((b) => (
                    <li key={b.productId} style={{ fontSize: '0.8125rem' }}>
                      <strong>{b.productId}</strong>: {b.syncStatus}
                      {b.externalProjectId ? ` → ${b.externalProjectId}` : ''}
                      {b.syncMessage ? ` (${b.syncMessage})` : ''}
                    </li>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </MsqdxCard>

      {syncMessage && (
        <MsqdxCard variant="flat" borderRadius="button" sx={{ p: 2, bgcolor: 'var(--color-bg-subtle)' }}>
          <MsqdxTypography variant="caption" weight="semibold" sx={{ display: 'block', mb: 1 }}>
            {t('admin.syncResult')}
          </MsqdxTypography>
          <Box component="pre" sx={{ m: 0, fontSize: '0.75rem', overflow: 'auto', maxHeight: 200 }}>
            {syncMessage}
          </Box>
        </MsqdxCard>
      )}
    </Stack>
  );
}
