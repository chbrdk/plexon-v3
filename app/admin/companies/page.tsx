'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import NextLink from 'next/link'
import { Alert, Button, Checkbox, Field, Input, SectionChrome, Spinner, Text } from '@msqdx/ui'
import { useI18n } from '@/components/i18n/I18nProvider'
import { API_ADMIN_COMPANIES, API_ADMIN_COMPANIES_BULK, pathAdminCompany } from '@/lib/constants'

type CompanyRow = {
  id: string
  name: string
  slug: string | null
  createdAt: string
  updatedAt: string
}

type Draft = { name: string; slug: string }

export default function AdminCompaniesPage() {
  const { t } = useI18n()
  const [items, setItems] = useState<CompanyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [creating, setCreating] = useState(false)
  const [q, setQ] = useState('')
  const [draftById, setDraftById] = useState<Record<string, Draft>>({})
  const baselineRef = useRef<Record<string, { name: string; slug: string | null }>>({})
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [savingList, setSavingList] = useState(false)
  const [batchError, setBatchError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(API_ADMIN_COMPANIES, { credentials: 'same-origin' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((data as { error?: string }).error ?? t('admin.loadError'))
        setItems([])
        return
      }
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch {
      setError(t('admin.loadError'))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const base: Record<string, { name: string; slug: string | null }> = {}
    const draft: Record<string, Draft> = {}
    for (const c of items) {
      base[c.id] = { name: c.name, slug: c.slug }
      draft[c.id] = { name: c.name, slug: c.slug ?? '' }
    }
    baselineRef.current = base
    setDraftById(draft)
    setSelected(new Set())
    setBatchError(null)
  }, [items])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return items
    return items.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        (c.slug ?? '').toLowerCase().includes(s) ||
        c.id.toLowerCase().includes(s),
    )
  }, [items, q])

  const dirtyIds = useMemo(() => {
    return items
      .map((c) => c.id)
      .filter((id) => {
        const draft = draftById[id]
        const base = baselineRef.current[id]
        if (!draft || !base) return false
        const slugDraft = draft.slug.trim()
        const slugBase = (base.slug ?? '').trim()
        return draft.name.trim() !== base.name.trim() || slugDraft !== slugBase
      })
  }, [items, draftById])

  const idsToSave = useMemo(() => {
    if (selected.size === 0) return dirtyIds
    return dirtyIds.filter((id) => selected.has(id))
  }, [dirtyIds, selected])

  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id))
  const someFilteredSelected = filtered.some((c) => selected.has(c.id))

  const toggleHeaderSelect = () => {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev)
        for (const c of filtered) next.delete(c.id)
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        for (const c of filtered) next.add(c.id)
        return next
      })
    }
  }

  const toggleRowSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const updateDraft = (id: string, patch: Partial<Draft>) => {
    setDraftById((prev) => {
      const cur = prev[id]
      if (!cur) return prev
      return { ...prev, [id]: { ...cur, ...patch } }
    })
  }

  const saveListChanges = async () => {
    if (idsToSave.length === 0) return
    setSavingList(true)
    setBatchError(null)
    setError(null)
    try {
      const payload = idsToSave.map((id) => {
        const d = draftById[id]
        return {
          id,
          name: d.name.trim(),
          slug: d.slug.trim() ? d.slug.trim().toLowerCase() : null,
        }
      })
      const res = await fetch(API_ADMIN_COMPANIES_BULK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ items: payload }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setBatchError(
          `${t('admin.companiesBatchSaveFailed')} ${(data as { error?: string }).error ?? res.status}`,
        )
        return
      }
      await load()
    } catch {
      setBatchError(`${t('admin.companiesBatchSaveFailed')} network`)
    } finally {
      setSavingList(false)
    }
  }

  const handleCreate = async () => {
    if (!name.trim()) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch(API_ADMIN_COMPANIES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((data as { error?: string }).error ?? t('admin.loadError'))
        return
      }
      setName('')
      setSlug('')
      await load()
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="plexon-admin-stack">
      <SectionChrome
        title={t('admin.companiesTitle')}
        meta={<Text role="meta">{t('admin.companiesSubtitle')}</Text>}
      />

      <section className="plexon-settings-section" aria-label={t('admin.createCompany')}>
        <SectionChrome title={t('admin.createCompany')} quiet as="h3" />
        <div className="plexon-settings-fields plexon-admin-form-narrow">
          <Field label={t('admin.companyName')}>
            <Input block value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={t('admin.companySlug')}>
            <Input block value={slug} onChange={(e) => setSlug(e.target.value)} />
          </Field>
          <Button
            variant="primary"
            onClick={() => void handleCreate()}
            disabled={creating || !name.trim()}
          >
            {creating ? t('admin.creating') : t('admin.createCompany')}
          </Button>
        </div>
      </section>

      <div className="plexon-admin-toolbar">
        <Field label={t('admin.searchCompanies')}>
          <Input block value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
        <Button
          variant="primary"
          onClick={() => void saveListChanges()}
          disabled={savingList || idsToSave.length === 0}
        >
          {savingList ? t('common.loading') : t('admin.companiesSaveListChanges')}
        </Button>
        <Button variant="ghost" onClick={() => void load()} disabled={loading || savingList}>
          {loading ? t('common.loading') : t('admin.refreshList')}
        </Button>
      </div>

      <Text role="meta">{t('admin.companiesListEditHint')}</Text>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {batchError ? <Alert tone="error">{batchError}</Alert> : null}

      {loading ? (
        <Text role="meta">
          <Spinner size="sm" /> {t('common.loading')}
        </Text>
      ) : items.length === 0 ? (
        <Text role="meta">{t('admin.noCompanies')}</Text>
      ) : (
        <div className="plexon-admin-table-wrap">
          <Text role="meta">
            {t('admin.listMetaFiltered', { filtered: filtered.length, total: items.length })}
            {dirtyIds.length > 0
              ? ` · ${t('admin.companiesPendingChanges', { count: dirtyIds.length })}`
              : ''}
          </Text>
          {filtered.length === 0 ? (
            <Text role="meta">{t('admin.companiesNoMatches')}</Text>
          ) : (
            <table className="plexon-admin-table">
              <thead>
                <tr>
                  <th className="plexon-admin-table__check">
                    <input
                      type="checkbox"
                      className="ds-checkbox"
                      checked={allFilteredSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = !allFilteredSelected && someFilteredSelected
                      }}
                      onChange={toggleHeaderSelect}
                      title={t('admin.selectAllFiltered')}
                      aria-label={t('admin.selectAllFiltered')}
                    />
                  </th>
                  <th>{t('admin.companyName')}</th>
                  <th>ID</th>
                  <th>Slug</th>
                  <th className="plexon-admin-table__actions">{t('dashboard.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const draft = draftById[c.id] ?? { name: c.name, slug: c.slug ?? '' }
                  const base = baselineRef.current[c.id]
                  const dirty =
                    !!base &&
                    (draft.name.trim() !== base.name.trim() ||
                      (draft.slug.trim() || '') !== ((base.slug ?? '').trim() || ''))
                  return (
                    <tr key={c.id} data-dirty={dirty ? 'true' : undefined}>
                      <td className="plexon-admin-table__check">
                        <Checkbox
                          checked={selected.has(c.id)}
                          onChange={() => toggleRowSelect(c.id)}
                          aria-label={c.name}
                        />
                      </td>
                      <td>
                        <Input
                          block
                          value={draft.name}
                          onChange={(e) => updateDraft(c.id, { name: e.target.value })}
                        />
                      </td>
                      <td className="plexon-admin-mono">{c.id}</td>
                      <td>
                        <Input
                          block
                          value={draft.slug}
                          onChange={(e) => updateDraft(c.id, { slug: e.target.value })}
                          placeholder="—"
                        />
                      </td>
                      <td className="plexon-admin-table__actions">
                        <NextLink href={pathAdminCompany(c.id)}>
                          <Button variant="ghost" size="sm">
                            {t('admin.open')}
                          </Button>
                        </NextLink>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
