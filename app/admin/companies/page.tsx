'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import NextLink from 'next/link';
import { Box, Stack } from '@mui/material';
import { MsqdxTypography, MsqdxCard, MsqdxButton, MsqdxFormField } from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { API_ADMIN_COMPANIES, API_ADMIN_COMPANIES_BULK, pathAdminCompany } from '@/lib/constants';

type CompanyRow = {
  id: string;
  name: string;
  slug: string | null;
  createdAt: string;
  updatedAt: string;
};

type Draft = { name: string; slug: string };

const cellInputSx = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 'var(--msqdx-radius-sm)',
  border: '1px solid var(--color-secondary-dx-grey-light-tint)',
  fontSize: '0.875rem',
  background: 'var(--color-card-bg)',
  color: 'var(--color-text-on-light)',
} as const;

export default function AdminCompaniesPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState('');
  const [draftById, setDraftById] = useState<Record<string, Draft>>({});
  const baselineRef = useRef<Record<string, { name: string; slug: string | null }>>({});
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [savingList, setSavingList] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_ADMIN_COMPANIES, { credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? t('admin.loadError'));
        setItems([]);
        return;
      }
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setError(t('admin.loadError'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const base: Record<string, { name: string; slug: string | null }> = {};
    const draft: Record<string, Draft> = {};
    for (const c of items) {
      base[c.id] = { name: c.name, slug: c.slug };
      draft[c.id] = { name: c.name, slug: c.slug ?? '' };
    }
    baselineRef.current = base;
    setDraftById(draft);
    setSelected(new Set());
    setBatchError(null);
  }, [items]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        (c.slug ?? '').toLowerCase().includes(s) ||
        c.id.toLowerCase().includes(s)
    );
  }, [items, q]);

  const dirtyIds = useMemo(() => {
    return items
      .map((c) => c.id)
      .filter((id) => {
        const draft = draftById[id];
        const base = baselineRef.current[id];
        if (!draft || !base) return false;
        const slugDraft = draft.slug.trim();
        const slugBase = (base.slug ?? '').trim();
        return draft.name.trim() !== base.name.trim() || slugDraft !== slugBase;
      });
  }, [items, draftById]);

  const idsToSave = useMemo(() => {
    if (selected.size === 0) return dirtyIds;
    return dirtyIds.filter((id) => selected.has(id));
  }, [dirtyIds, selected]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const someFilteredSelected = filtered.some((c) => selected.has(c.id));

  const toggleHeaderSelect = () => {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const c of filtered) next.delete(c.id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const c of filtered) next.add(c.id);
        return next;
      });
    }
  };

  const toggleRowSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateDraft = (id: string, patch: Partial<Draft>) => {
    setDraftById((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      return { ...prev, [id]: { ...cur, ...patch } };
    });
  };

  const saveListChanges = async () => {
    if (idsToSave.length === 0) return;
    setSavingList(true);
    setBatchError(null);
    setError(null);
    try {
      const items = idsToSave.map((id) => {
        const d = draftById[id];
        return {
          id,
          name: d.name.trim(),
          slug: d.slug.trim() ? d.slug.trim().toLowerCase() : null,
        };
      });
      const res = await fetch(API_ADMIN_COMPANIES_BULK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ items }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBatchError(
          `${t('admin.companiesBatchSaveFailed')} ${(data as { error?: string }).error ?? res.status}`
        );
        return;
      }
      await load();
    } catch {
      setBatchError(`${t('admin.companiesBatchSaveFailed')} network`);
    } finally {
      setSavingList(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(API_ADMIN_COMPANIES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? t('admin.loadError'));
        return;
      }
      setName('');
      setSlug('');
      await load();
    } finally {
      setCreating(false);
    }
  };

  return (
    <Stack spacing={3}>
      <MsqdxTypography variant="h5" weight="semibold">
        {t('admin.companiesTitle')}
      </MsqdxTypography>
      <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
        {t('admin.companiesSubtitle')}
      </MsqdxTypography>

      <MsqdxCard
        variant="flat"
        borderRadius="button"
        sx={{
          p: 'var(--msqdx-spacing-md)',
          border: '1px solid var(--color-secondary-dx-grey-light-tint)',
          bgcolor: 'var(--color-card-bg)',
        }}
      >
        <MsqdxTypography variant="subtitle1" weight="semibold" sx={{ mb: 2 }}>
          {t('admin.createCompany')}
        </MsqdxTypography>
        <Stack spacing={2} sx={{ maxWidth: 480 }}>
          <MsqdxFormField
            label={t('admin.companyName')}
            value={name}
            onChange={(e) => setName((e.target as HTMLInputElement).value)}
            fullWidth
          />
          <MsqdxFormField
            label={t('admin.companySlug')}
            value={slug}
            onChange={(e) => setSlug((e.target as HTMLInputElement).value)}
            fullWidth
          />
          <MsqdxButton variant="contained" onClick={() => void handleCreate()} disabled={creating || !name.trim()}>
            {creating ? t('admin.creating') : t('admin.createCompany')}
          </MsqdxButton>
        </Stack>
      </MsqdxCard>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} flexWrap="wrap">
        <MsqdxFormField
          label={t('admin.searchCompanies')}
          value={q}
          onChange={(e) => setQ((e.target as HTMLInputElement).value)}
          fullWidth
          sx={{ maxWidth: 400 }}
        />
        <MsqdxButton variant="contained" onClick={() => void saveListChanges()} disabled={savingList || idsToSave.length === 0}>
          {savingList ? t('common.loading') : t('admin.companiesSaveListChanges')}
        </MsqdxButton>
        <MsqdxButton variant="outlined" onClick={() => void load()} disabled={loading || savingList}>
          {loading ? t('common.loading') : t('admin.refreshList')}
        </MsqdxButton>
      </Stack>

      <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)', maxWidth: 720 }}>
        {t('admin.companiesListEditHint')}
      </MsqdxTypography>

      {error && (
        <MsqdxTypography variant="body2" color="error">
          {error}
        </MsqdxTypography>
      )}
      {batchError && (
        <MsqdxTypography variant="body2" color="error">
          {batchError}
        </MsqdxTypography>
      )}

      {loading ? (
        <MsqdxTypography variant="body2" color="text.secondary">
          {t('common.loading')}
        </MsqdxTypography>
      ) : items.length === 0 ? (
        <MsqdxTypography variant="body2" color="text.secondary">
          {t('admin.noCompanies')}
        </MsqdxTypography>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-secondary)', display: 'block', mb: 1 }}>
            {t('admin.listMetaFiltered', { filtered: filtered.length, total: items.length })}
            {dirtyIds.length > 0
              ? ` · ${t('admin.companiesPendingChanges', { count: dirtyIds.length })}`
              : ''}
          </MsqdxTypography>
          {filtered.length === 0 ? (
            <MsqdxTypography variant="body2" color="text.secondary">
              {t('admin.companiesNoMatches')}
            </MsqdxTypography>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr>
                  <th style={{ width: 40, padding: '8px 4px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = !allFilteredSelected && someFilteredSelected;
                      }}
                      onChange={toggleHeaderSelect}
                      title={t('admin.selectAllFiltered')}
                      aria-label={t('admin.selectAllFiltered')}
                    />
                  </th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                    {t('admin.companyName')}
                  </th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                    ID
                  </th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                    Slug
                  </th>
                  <th style={{ textAlign: 'right', padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                    {t('dashboard.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const draft = draftById[c.id] ?? { name: c.name, slug: c.slug ?? '' };
                  const base = baselineRef.current[c.id];
                  const dirty =
                    !!base &&
                    (draft.name.trim() !== base.name.trim() ||
                      (draft.slug.trim() || '') !== ((base.slug ?? '').trim() || ''));
                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: '1px solid var(--color-border-subtle)',
                        backgroundColor: dirty ? 'var(--color-bg-subtle)' : undefined,
                      }}
                    >
                      <td style={{ padding: '8px 4px', verticalAlign: 'middle' }}>
                        <input
                          type="checkbox"
                          checked={selected.has(c.id)}
                          onChange={() => toggleRowSelect(c.id)}
                          aria-label={c.name}
                        />
                      </td>
                      <td style={{ padding: '8px 12px', minWidth: 160, verticalAlign: 'middle' }}>
                        <input
                          style={cellInputSx}
                          value={draft.name}
                          onChange={(e) => updateDraft(c.id, { name: e.target.value })}
                        />
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.75rem', verticalAlign: 'middle' }}>
                        {c.id}
                      </td>
                      <td style={{ padding: '8px 12px', minWidth: 140, verticalAlign: 'middle' }}>
                        <input
                          style={cellInputSx}
                          value={draft.slug}
                          onChange={(e) => updateDraft(c.id, { slug: e.target.value })}
                          placeholder="—"
                        />
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', verticalAlign: 'middle' }}>
                        <NextLink href={pathAdminCompany(c.id)} style={{ textDecoration: 'none' }}>
                          <MsqdxButton variant="outlined" size="small">
                            {t('admin.open')}
                          </MsqdxButton>
                        </NextLink>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Box>
      )}
    </Stack>
  );
}
