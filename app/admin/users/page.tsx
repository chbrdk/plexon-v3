'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import NextLink from 'next/link';
import { Box, Stack } from '@mui/material';
import { MsqdxTypography, MsqdxButton, MsqdxFormField } from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import {
  API_ADMIN_USERS,
  apiAdminUser,
  pathAdminCompany,
  pathAdminUserEditOnDashboard,
} from '@/lib/constants';

type UserOrg = { companyId: string; companyName: string; companySlug: string | null; role: string };

type UserRow = {
  id: string;
  email?: string;
  name?: string;
  company?: string;
  locale?: string;
  role?: string;
  createdAt?: string;
  organizations?: UserOrg[];
};

export default function AdminUsersPage() {
  const { t } = useI18n();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_ADMIN_USERS, { credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? t('admin.loadError'));
        setUsers([]);
        return;
      }
      setUsers(Array.isArray(data.data) ? data.data : []);
    } catch {
      setError(t('admin.loadError'));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm(t('dashboard.deleteUserConfirm'))) return;
      setDeletingId(id);
      setError(null);
      try {
        const res = await fetch(apiAdminUser(id), { method: 'DELETE', credentials: 'same-origin' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError((data as { error?: string }).error ?? t('admin.deleteUserFailed'));
          return;
        }
        await load();
      } catch {
        setError(t('admin.deleteUserFailed'));
      } finally {
        setDeletingId(null);
      }
    },
    [load, t]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) => {
      const orgMatch = (u.organizations ?? []).some(
        (o) =>
          o.companyName.toLowerCase().includes(s) ||
          (o.companySlug ?? '').toLowerCase().includes(s) ||
          o.companyId.toLowerCase().includes(s) ||
          o.role.toLowerCase().includes(s)
      );
      return (
        u.id.toLowerCase().includes(s) ||
        (u.email ?? '').toLowerCase().includes(s) ||
        (u.name ?? '').toLowerCase().includes(s) ||
        (u.company ?? '').toLowerCase().includes(s) ||
        orgMatch
      );
    });
  }, [users, q]);

  return (
    <Stack spacing={3}>
      <MsqdxTypography variant="h5" weight="semibold">
        {t('admin.usersTitle')}
      </MsqdxTypography>
      <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
        {t('admin.usersSubtitle')}
      </MsqdxTypography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
        <MsqdxFormField label={t('admin.searchUsers')} value={q} onChange={(e) => setQ((e.target as HTMLInputElement).value)} fullWidth sx={{ maxWidth: 400 }} />
        <MsqdxButton variant="outlined" onClick={() => void load()} disabled={loading}>
          {loading ? t('common.loading') : t('admin.refreshList')}
        </MsqdxButton>
      </Stack>

      {error && (
        <MsqdxTypography variant="body2" color="error">
          {error}
        </MsqdxTypography>
      )}

      {loading ? (
        <MsqdxTypography variant="body2" color="text.secondary">
          {t('common.loading')}
        </MsqdxTypography>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-secondary)', display: 'block', mb: 1 }}>
            {t('admin.listMetaFiltered', { filtered: filtered.length, total: users.length })}
          </MsqdxTypography>
          {filtered.length === 0 ? (
            <MsqdxTypography variant="body2" color="text.secondary">
              {t('admin.usersNoMatches')}
            </MsqdxTypography>
          ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  {t('dashboard.email')}
                </th>
                <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  {t('dashboard.name')}
                </th>
                <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  {t('admin.usersProfileCompany')}
                </th>
                <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  {t('dashboard.role')}
                </th>
                <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  {t('admin.usersOrganizations')}
                </th>
                <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  ID
                </th>
                <th style={{ textAlign: 'right', padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  {t('dashboard.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <td style={{ padding: '8px 12px' }}>{u.email ?? '—'}</td>
                  <td style={{ padding: '8px 12px' }}>{u.name ?? '—'}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)' }}>{u.company ?? '—'}</td>
                  <td style={{ padding: '8px 12px' }}>{u.role ?? '—'}</td>
                  <td style={{ padding: '8px 12px', maxWidth: 280 }}>
                    {(u.organizations ?? []).length === 0 ? (
                      <MsqdxTypography variant="body2" component="span" sx={{ color: 'var(--color-text-secondary)' }}>
                        —
                      </MsqdxTypography>
                    ) : (
                      <Stack component="span" direction="column" spacing={0.5} sx={{ display: 'inline-flex' }}>
                        {(u.organizations ?? []).map((o) => (
                          <NextLink
                            key={`${u.id}-${o.companyId}`}
                            href={pathAdminCompany(o.companyId)}
                            style={{ color: 'var(--color-primary-main, #1976d2)', textDecoration: 'none', fontSize: '0.8125rem' }}
                          >
                            {o.companyName}
                            <span style={{ color: 'var(--color-text-secondary)', marginLeft: 6 }}>({o.role})</span>
                          </NextLink>
                        ))}
                      </Stack>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.75rem' }}>{u.id}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                      <NextLink href={pathAdminUserEditOnDashboard(u.id)} style={{ textDecoration: 'none' }}>
                        <MsqdxButton variant="contained" size="small">
                          {t('admin.fullEdit')}
                        </MsqdxButton>
                      </NextLink>
                      <MsqdxButton
                        variant="text"
                        size="small"
                        color="error"
                        disabled={deletingId === u.id || loading}
                        onClick={() => void handleDelete(u.id)}
                      >
                        {deletingId === u.id ? t('admin.deletingUser') : t('dashboard.delete')}
                      </MsqdxButton>
                    </Stack>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </Box>
      )}
    </Stack>
  );
}
